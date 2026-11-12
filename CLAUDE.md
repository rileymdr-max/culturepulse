# CulturePulse — instructions for Claude

## Keep PLAYBOOK.md up to date (required)

`PLAYBOOK.md` is the owner's living guide to how the site works. In the same change (same commit / same branch) as any work on the site, update the sections it affects:

- New or changed data source, Apify actor, scraping inputs or costs → §3
- Claude model, prompt or AI feature change → §4
- Any score, threshold, tier or formula change → §5
- Plan prices, limits, accounts, demo/approval rules → §6
- New/removed service, subscription, or environment variable → §7
- New screens, folders, workflow or launch-checklist items → §1, §2, §8

Then bump the "Last updated" date and add one plain-language line to the §9 Change log. Skip only for changes with no effect on anything the playbook describes (e.g. pure styling tweaks). Never put passwords, keys or tokens in it.

Reminders and break-fix checklists go in `MAINTENANCE-NOTES.md`, not the playbook.

## Writing style for these docs

The owner is non-technical: plain words, short tables, file paths for reference.
