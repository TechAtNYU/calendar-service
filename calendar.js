var ical = require('ical-generator');
var http = require('http');
var request = require('request');
var cal = ical();
 
cal.setDomain('api.tnyu.org').setName('Events');
 
request({url: 'https://api.tnyu.org/v2/events', rejectUnauthorized: false}, function(err, res, body) {
    if (!err && res.statusCode == 200) {
        var events = JSON.parse(body).data;
        events.forEach(addEvent);
    }
});

function addEvent(event) {
    var prepend = "";
    
    // this is a draft event, so skip it.
    if(event.links.status.linkage.id === "54837a0ef07bddf3776c79da") return;
     
    // if it's a canceled event, add [Canceled] to the title
    if(event.link.status.linkage.id === "54837a0ec8d83b0e17d7b009") {
      prepend = "[Canceled] ";
    }
    
    cal.addEvent({
        start: new Date(event.startDateTime),
        end: new Date(event.endDateTime),
        summary: prepend + (event.shortTitle || event.title || ('Tech@NYU Event')),
        description: event.description || event.details,
        url: event.rsvpUrl || ''
    });
}

http.createServer(function(req, res) {
    cal.serve(res);
}).listen(9999, '0.0.0.0', function(){
    console.log('Server running at http://127.0.0.1:9999/');
});
