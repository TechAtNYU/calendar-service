var ical = require('ical-generator');
var http = require('http');
var request = require('request');
var cal = ical();
 
cal.setDomain('api.tnyu.org').setName('Events');
 
request({url: 'https://api.tnyu.org/v1.0/events', rejectUnauthorized: false}, function(err, res, body) {
    if (!err && res.statusCode == 200) {
        var events = JSON.parse(body).events;
        events.forEach(addEvent);
    }
});

function addEvent(event) {
    cal.addEvent({
        start: new Date(event.startDateTime),
        end: new Date(event.endDateTime),
        summary: event.shortTitle || event.title || ('Tech@NYU Event'),
        description: event.description || event.details,
        url: event.rsvpUrl || ''
    });
}

http.createServer(function(req, res) {
    cal.serve(res);
}).listen(9999, '0.0.0.0', function(){
    console.log('Server running at http://127.0.0.1:9999/');
});
