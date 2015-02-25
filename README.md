# calendar-server
Serves .ics files (i.e. calendar feeds) generated using the events in the Tech@NYU API.

# To Do

Justin already has [a PR](https://github.com/TechAtNYU/api/pull/35) started to add calendaring to the API repo. 
That PR first needs to be updated in response to some comments left on it, and then the code should be moved 
to this repo, inline with our convention of storing services outside of the API itself.

After the basic calendar-generation code is working, those functions need to be wrapped in an Express server
that will generate calendars for different subsets of our events at different routes. In particular, I'm imagining
we should suppor the following calendars to start:

- A master calendar feed, which includes all our events, including internal and draft events. This will replace the internal Google calendar.
- A public calendar feed, which is the master calendar minus internal and draft events. (Canceled events should perhaps be included, but their title and description should very clearly indicate that they’re calenceled.)
- A design feed, which includes events hosted by the design days team, the after hours team, or the demo days team.
- A programming feed, which includes events hosted by the hack days team, the after hours team, or the demo days team.
- An entrepreneurship feed, which includes events hosted by the after hours team as well and events hosted _only_ by the startup week team (i.e. not sw + design or sw + hack, but only sw).
