var express = require('express'),
    app = express();
var fs = require('fs');

// Mongo

var collName = 'meetings';
var MongoClient = require('mongodb').MongoClient;
var url = process.env.ATLAS;

// HTML wrappers for AA data
var index1 = fs.readFileSync("index1.txt");
var index3 = fs.readFileSync("index3.txt");


app.get('/aa', function(req, res) {

    MongoClient.connect(url, function(err, db) {
        if (err) { return console.dir(err); }

        var weekArray =
            ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        var dateTimeNow = new Date();
        var today = dateTimeNow.getDay();

        // var tomorrow;
        //     if (today == 6) { tomorrow = 0; }
        //     else { tomorrow = today + 1 }

        var hour = dateTimeNow.getHours();

        var todayMatch = weekArray[today];

        // var tomorrowMatch = weekArray[tomorrow];

        console.log(todayMatch)
        // console.log(tomorrowMatch)

        var collection = db.collection(collName);

        collection.aggregate([ // start of aggregation pipeline
            // // match by day and time

            { $unwind: "$meetings" },

            { $match :

                { $and: [
                        { "meetings.day" : todayMatch } , { "meetings.startH" : { $gte: hour } }
                    ]}
        },

            // group by meeting group
            {
                $group: {
                    _id: {
                        latLong: "$latLong",
                        locationName: '$locationName',
                        meetingName: "$groupName",
                        meetingAddress1: "$address1",
                        meetingAddress2: "$address2",
                        meetingWheelchair: "$wheelchair",
                        locationNotes: "$notes",
                        meetingDetails: "$meetings"
                    },
                    meetingDay: { $push: "$meetings.day" },
                    meetingStartTime: { $push: "$meetings.start" },
                    meetingType: { $push: "$meetings.type" }
                }
            },

            // group meeting groups by latLong
            {
                $group: {
                    _id: {
                        latLong: "$_id.latLong"
                    },
                    meetingGroups : { $push : {groupInfo : "$_id", meetingDay : "$meetingDay", meetingStartTime : "$meetingStartTime", meetingType : "$meetingType" }}
                }
            }

        ]).toArray(function(err, docs) { // end of aggregation pipeline
            if (err) { console.log(err) }

            else {
                res.writeHead(200, { 'content-type': 'text/html' });
                res.write(index1);
                res.write(JSON.stringify(docs));
                res.end(index3);
            }
            db.close();
        });
    });

});

// app.listen(process.env.PORT, function() {
app.listen(4000, function() {
    console.log('Server listening...');
});