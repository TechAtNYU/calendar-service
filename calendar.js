'use strict';

var ical = require('ical-generator');
var http = require('http');
var request = require('request-promise');

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

// Prep teams array
var teamIdsToRoleNames = {};
var venueIdsToVenues = {};
request({url: 'https://api.tnyu.org/v3/teams', rejectUnauthorized: false})
        .then(function(teamsBody) {
            var teams = JSON.parse(teamsBody).data;
            for (var i = 0; i < teams.length; i++) {
                var currentTeam = teams[i];
                teamIdsToRoleNames[currentTeam.id] = currentTeam.attributes.roleName;
            }

            return request({url: 'https://api.tnyu.org/v3/events?include=venue', rejectUnauthorized: false});
        }).then(function(eventsBody) {
            var JSONBody = JSON.parse(eventsBody);
            var events = JSONBody.data;
            var venues = JSONBody.included;
            for (var i = 0; i < venues.length; i++) {
                var currentVenue = venues[i];
                if (currentVenue.type === 'venues') {
                    venueIdsToVenues[currentVenue.id] = currentVenue;
                }
            }
            events.forEach(addEvent);
        }).then(function() {
            GeneralFeed.save("./calendars/general.ics");
            MasterFeed.save("./calendars/master.ics");
            DesignFeed.save("./calendars/design.ics");
            ProgrammingFeed.save("./calendars/programming.ics");
            EntrepreneurshipFeed.save("./calendars/entrepreneurship.ics");
        });

function addEvent(event) {
    var status = event.links.status && event.links.status.linkage && event.links.status.linkage.id;

    // if the event doesn't have a start and end time, which
    // (unbelievably) can happen, as such is human error, just skip it.
    if (!event.attributes.startDateTime || !event.attributes.endDateTime) {
        return;
    }

    // E-board feed
    // A master calendar feed, which includes all our events,
    // including internal and draft events. This will replace
    // the internal Google calendar.
    MasterFeed.addEvent(apiEventToFeedObject(event));

    // A public calendar feed, which is the master calendar
    // minus internal and draft events.
    if (!event.attributes.isInternal && status !== 'draft') {
        GeneralFeed.addEvent(apiEventToFeedObject(event));
    }
    // Starting filters
    else if (event.links.teams && event.links.teams.linkage) {
        for (var i = 0; i < event.links.teams.linkage.length; i++) {
            // DesignDays, DemoDays, AfterHours events add to feeds: Design feed
            if (teamIdsToRoleNames[event.links.teams.linkage[i].id] === 'DESIGN_DAYS' ||
                teamIdsToRoleNames[event.links.teams.linkage[i].id] === 'AFTER_HOURS' ||
                teamIdsToRoleNames[event.links.teams.linkage[i].id] === 'DEMO_DAYS') {
                DesignFeed.addEvent(apiEventToFeedObject(event));
            }

            // DemoDays, HackDays, AfterHours events add to feeds: Programming
            if (teamIdsToRoleNames[event.links.teams.linkage[i].id] === 'DEMO_DAYS' ||
                teamIdsToRoleNames[event.links.teams.linkage[i].id] === 'AFTER_HOURS' ||
                teamIdsToRoleNames[event.links.teams.linkage[i].id] === 'HACK_DAYS') {
                ProgrammingFeed.addEvent(apiEventToFeedObject(event));
            }

            // AfterHours events add to the feed: Entrepreneurship
            if (teamIdsToRoleNames[event.links.teams.linkage[i].id] === 'AFTER_HOURS' ||
                teamIdsToRoleNames[event.links.teams.linkage[i].id] === 'DEMO_DAYS') {
                EntrepreneurshipFeed.addEvent(apiEventToFeedObject(event));
            }

            // Special Case:
            // Startupweek events add to feeds: Entrepreneurship
            if (teamIdsToRoleNames[event.links.teams.linkage[i].id] === 'STARTUP_WEEK') {
                // events hosted only by the startup week team
                // (i.e. not sw + design or sw + hack, but only sw).
                if (event.links.teams.linkage.length === 1) {
                    EntrepreneurshipFeed.addEvent(apiEventToFeedObject(event));
                }
            }
        }
    }
}

/**
 * Maps the JSON for an event from our API to an object usable by the ical lib.
 */
function apiEventToFeedObject(event) {
    var status = event.attributes.status;
    var prepend = '';

    // (Canceled events, if included, need to say [Canceled] in their title.
    if (status === 'canceled') {
        prepend = '[Canceled] ';
    }

    if (status === 'draft') {
        prepend = '[Draft] ';
    }

    var result = {
        start: new Date(event.attributes.startDateTime),
        end: new Date(event.attributes.endDateTime),
        summary: prepend + (event.attributes.shortTitle || event.attributes.title || ('Tech@NYU Event')),
        description: event.attributes.bodyPlain,
        url: event.attributes.rsvpUrl || ''
    };

    if (event.links && event.links.venue && event.links.venue.linkage) {
        result.location = venueIdsToVenues[event.links.venue.linkage.id].attributes.address;
    }

    return result;
}
