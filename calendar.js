var ical = require('ical-generator');
var http = require('http');
var request = require('request');

// Feed for the e-board
var MasterFeed = ical();
MasterFeed.setDomain('techatnyu.org').setName('Tech@NYU E-board Calendar');

// General Feed for everyone
var GeneralFeed = ical();
GeneralFeed.setDomain('techatnyu.org').setName('Tech@NYU Calendar');

// Feed for design peeps
var DesignFeed = ical();
DesignFeed.setDomain('techatnyu.org').setName('Tech@NYU Design Events');

// Feed for programming peeps
var ProgrammingFeed = ical();
ProgrammingFeed.setDomain('techatnyu.org').setName('Tech@NYU Programming Events');

// Feed for entrepreneurship peeps
var EntrepreneurshipFeed = ical();
EntrepreneurshipFeed.setDomain('techatnyu.org').setName('Tech@NYU Entrepreneurship Events');

// Fill in 
var teamsArray = [];
request({url: 'https://api.tnyu.org/v1.0/teams', rejectUnauthorized: false}, function(err, res, body) {
    if (!err && res.statusCode == 200) {
        var teams = JSON.parse(body).teams;
        for (var i = 0; i < teams.length; i++) {
            var currentTeam = teams[i];
            teamsArray[currentTeam.id] = currentTeam.name;
        };
    }
});

var addEvent = function(event) {
    var prepend = ''
      , status  = event.links.status && event.links.status.linkage && event.links.status.linkage.id;

    // if the event doesn't have a start and end time, which
    // (unbelievably) can happen, as such is human error, just skip it.
    if(!event.startDateTime || !event.endDateTime) return;


    // (Canceled events should perhaps be included, but 
    // their title and description should very clearly 
    // indicate that they’re calenceled.)
    // if it's a canceled event, add [Canceled] to the title
    if(status === '54837a0ec8d83b0e17d7b009') {
      prepend = '[Canceled] ';
    }

    // E-board feed
    // A master calendar feed, which includes all our events, 
    // including internal and draft events. This will replace 
    // the internal Google calendar.
    MasterFeed.addEvent({
        start: new Date(event.startDateTime),
        end: new Date(event.endDateTime),
        summary: prepend + (event.shortTitle || event.title || ('Tech@NYU Event')),
        description: event.description || event.details,
        url: event.rsvpUrl || ''
    });

    // A public calendar feed, which is the master calendar 
    // minus internal and draft events. 
    if(!event.isInternal && status !== '54837a0ef07bddf3776c79da') {
        GeneralFeed.addEvent({
            start: new Date(event.startDateTime),
            end: new Date(event.endDateTime),
            summary: prepend + (event.shortTitle || event.title || ('Tech@NYU Event')),
            description: event.description || event.details,
            url: event.rsvpUrl || ''
        });
    }

    // Starting filters
    if(event.links.teams && event.links.teams.linkage){
        for (var i = 0; i < event.links.teams.linkage.length; i++) {
            // DesignDays, DemoDays, AfterHours events add to feeds: Design feed
            if(teamsArray[event.links.teams.linkage[i].id] == 'Design Days' 
                || teamsArray[event.links.teams.linkage[i].id] == 'After Hours'
                || teamsArray[event.links.teams.linkage[i].id] == 'Demo Days'){
                DesignFeed.addEvent({
                    start: new Date(event.startDateTime),
                    end: new Date(event.endDateTime),
                    summary: prepend + (event.shortTitle || event.title || ('Tech@NYU Event')),
                    description: event.description || event.details,
                    url: event.rsvpUrl || ''
                });
            }

            // DemoDays, HackDays, AfterHours events add to feeds: Programming
            if(teamsArray[event.links.teams.linkage[i].id] == 'Demo Days'
                || teamsArray[event.links.teams.linkage[i].id] == 'After Hours'
                || teamsArray[event.links.teams.linkage[i].id] == 'Hack Days'){
                ProgrammingFeed.addEvent({
                    start: new Date(event.startDateTime),
                    end: new Date(event.endDateTime),
                    summary: prepend + (event.shortTitle || event.title || ('Tech@NYU Event')),
                    description: event.description || event.details,
                    url: event.rsvpUrl || ''
                });
            }

            // AfterHours events add to the feed: Entrepreneurship
            if(teamsArray[event.links.teams.linkage[i].id] == 'After Hours'){
                EntrepreneurshipFeed.addEvent({
                    start: new Date(event.startDateTime),
                    end: new Date(event.endDateTime),
                    summary: prepend + (event.shortTitle || event.title || ('Tech@NYU Event')),
                    description: event.description || event.details,
                    url: event.rsvpUrl || ''
                });
            }

            // Special Case:
            // Startupweek events add to feeds: Entrepreneurship
            if(teamsArray[event.links.teams.linkage[i].id] == 'Startup Week'){
                // events hosted only by the startup week team 
                // (i.e. not sw + design or sw + hack, but only sw).
                if(event.links.teams.linkage.length == 1) {
                    EntrepreneurshipFeed.addEvent({
                        start: new Date(event.startDateTime),
                        end: new Date(event.endDateTime),
                        summary: prepend + (event.shortTitle || event.title || ('Tech@NYU Event')),
                        description: event.description || event.details,
                        url: event.rsvpUrl || ''
                    });
                }
            }
        };
    }
}

request({url: 'https://api.tnyu.org/v2/events', rejectUnauthorized: false}, function(err, res, body) {
    if (!err && res.statusCode == 200) {
        var events = JSON.parse(body).data;
        events.forEach(addEvent);
    }
});

http.createServer(function(req, res) {
    console.log(req.url);
    if(req.url == '/') {
        GeneralFeed.serve(res);
    } else if(req.url == '/eboard') {
        MasterFeed.serve(res);
    } else if(req.url == '/design') {
        DesignFeed.serve(res);
    } else if(req.url == '/programming') {
        ProgrammingFeed.serve(res);
    } else if(req.url = '/entrepreneurship') {
        EntrepreneurshipFeed.serve(res);
    }
}).listen(9999, '0.0.0.0', function(){
    console.log('Server running at http://127.0.0.1:9999/');
});
