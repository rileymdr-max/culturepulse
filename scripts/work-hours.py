#!/usr/bin/env python3
"""Estimate hands-on hours spent on CulturePulse, week by week.

Reads the time stamps of Claude Code sessions for this project (~/.claude/projects/*Speedbag*)
and this repo's commit times. Activity less than 30 minutes apart counts as one work block;
each block gets 5 extra minutes for reading and thinking around it. Parallel sessions are
merged, so overlapping time is counted once. Nothing from the sessions' content is read
beyond time stamps and message type.

Usage:
  python3 -I scripts/work-hours.py              # every week (Monday start, local time), as JSON
  python3 -I scripts/work-hours.py --last-week  # only the last full Monday–Sunday week
"""
import glob, json, os, subprocess, sys
from collections import defaultdict
from datetime import datetime, timedelta

GAP = timedelta(minutes=30)
PAD = timedelta(minutes=5)
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def parse(ts):
    return datetime.fromisoformat(ts.replace('Z', '+00:00')).astimezone()


def activity():
    times = []
    for f in glob.glob(os.path.expanduser('~/.claude/projects/*Speedbag*/*.jsonl')):
        with open(f, errors='ignore') as fh:
            for line in fh:
                if '"timestamp"' not in line:
                    continue
                try:
                    o = json.loads(line)
                except ValueError:
                    continue
                if o.get('type') in ('user', 'assistant') and o.get('timestamp'):
                    times.append(parse(o['timestamp']))
    log = subprocess.run(['git', '-C', REPO, 'log', '--all', '--format=%aI'], capture_output=True, text=True).stdout
    times += [parse(x) for x in log.split()]
    return sorted(set(times))


def blocks(times):
    out = []
    if not times:
        return out
    start = prev = times[0]
    for t in times[1:]:
        if t - prev > GAP:
            out.append((start, prev))
            start = t
        prev = t
    out.append((start, prev))
    return out


def weekly(bl):
    weeks = defaultdict(lambda: {'hours': timedelta(), 'days': set(), 'blocks': 0})
    for s, e in bl:
        monday = (s - timedelta(days=s.weekday())).date()
        w = weeks[monday]
        w['hours'] += (e - s) + PAD
        w['days'].add(s.date())
        w['blocks'] += 1
    return [
        {'week_of': str(k), 'hours': round(v['hours'].total_seconds() / 3600, 1),
         'days_active': len(v['days']), 'work_blocks': v['blocks']}
        for k, v in sorted(weeks.items())
    ]


if __name__ == '__main__':
    rows = weekly(blocks(activity()))
    if '--last-week' in sys.argv:
        today = datetime.now().astimezone().date()
        last_monday = str(today - timedelta(days=today.weekday() + 7))
        rows = [r for r in rows if r['week_of'] == last_monday] or [
            {'week_of': last_monday, 'hours': 0.0, 'days_active': 0, 'work_blocks': 0}]
    print(json.dumps(rows, indent=1))
