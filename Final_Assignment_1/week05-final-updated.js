// ----------------------- PREP -----------------------
// arrange the variables and environment

var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var async = require('async');

var apiKey = process.env.GMAKEY;

var leftCol = [];
var address = [];
var details = [];
var jsonMeetings = [];
var addressData = [];

var content = fs.readFileSync('week_01_data/m10.txt');
var $ = cheerio.load(content);

// ----------------------- ASYNC -----------------------
// run the correct function order

async function runOrder() {
    fillArrays();
    cleanseDetails();
    meetingObjects();
    api();
    jsonNotation();
    addToMongo();
};

runOrder();

// ----------------------- PARSE -----------------------
// parse the data and fill two arrays: (1) the entire left column cell and
// (2) the meeting specific details in the center column cell

function fillArrays() {
    for (i=1; i<23; i++) {
        leftCol.push($('td')
            .eq((i*3)).contents().text().trim()
            .replace('\n\t\t\t\t\t\t\n\t\t\t\t\t\t\n                         \n\t\t\t\t\t\t\n                        ',' // ')
            .replace('\n\t\t\t\t\t\t',' // ')
            .replace('\n\t\t\t\t\t\t\n\t\t\t\t\t\t\n                        \n                         \n                        \t',' // ')
            .replace('\n\t\t\t\t  \t    ',' // ')
            .replace('\n\t\t\t\t\t\t',' // ')
            .replace('\n                        \n                         \n\t\t\t\t\t\t\n                        ',' // ')
        );
    }
    for (i=1; i<23; i++) {
        details.push($('td')
            .eq((i*3)+1).contents().text().trim()
            .replace('Sober\n\t\t\t \t\t\t\n                    \t\n                    \t\n\t\t\t\t  \t    ','Sober \n\t\t\t \t\t\t\n                    \t\n                    \t\n\t\t\t\t  \t    ')
            .replace('Bisexual\n\t\t\t \t\t\t\n                    \t\n                    \t\n\t\t\t\t  \t    ','Bisexual \n\t\t\t \t\t\t\n                    \t\n                    \t\n\t\t\t\t  \t    ')
            .split(' \n\t\t\t \t\t\t\n                    \t\n                    \t\n\t\t\t\t  \t    ')
        );
    }
}

// ----------------------- DATA CLEANSE -----------------------
// clean up the text in the meeting details to (1) allow for an easy split, 
// (2) populate wheelchair info, and (3) populate the street address array

function cleanseDetails() {

    for (i in leftCol) {
        
        leftCol[i] = leftCol[i].split(' // ')
        
        if (leftCol[i][5] == 'Wheelchair access') {
            leftCol[i][5] = 'Wheelchair available'
        } else {leftCol[i][5] = 'Wheelchair unavailable'}
        if (leftCol[i][4] == 'Wheelchair access') {
            leftCol[i][5] = 'Wheelchair available'}
        if (leftCol[i][4] == undefined) {
            leftCol[i][4] = 'no notes'}
            
        address[i] = leftCol[i][2].replace(/,/g,'').trim()
        
        if (leftCol[i][2] == '(@ 200th Street, behind Dyckman Avenue ) NY 10040') {
            address[i] = '35 Thayer Street, Basement'}
    }
    
    for (i in details) {
        for (j in details[i]) {
            details[i][j] = details[i][j]
                .replace('days','day')
                .replace(' From ',' // ')
                .replace(' to ',' // ')
                .replace(' Meeting Type ',' // ')
                .replace(' = ',' // ')
                .replace(' Special Interest ',' // ')
        }
    }
}


// ----------------------- MEETINGS OBJECTS -----------------------
// place all the meetings in JSON object array so that the array can be added 
// to the final JSON object later

function meetingObjects() {
    for (i=0; i<details.length; i++) {
        details[i] = jsonMeetingNotation(details[i]);
    }
    // console.log(details)

    function jsonMeetingNotation(input) {
        var output=[];
        for (var j in input) {
            var thisMeeting = new Object
            thisMeeting.day = input[j].split(' // ')[0].trim()
            
            // turn start time into 24 hour
            if (input[j].split(' // ')[1].slice(-2) == 'PM') {
                var shour = Number(input[j].split(' // ')[1].slice(-8,-6).trim()) + 12
                var smin = Number(input[j].split(' // ')[1].slice(-5,-2).trim())
                thisMeeting.startH = shour
                thisMeeting.startM = smin
                thisMeeting.start = shour + ':' + smin
            } else {
                var shour = Number(input[j].split(' // ')[1].slice(-8,-6).trim())
                var smin = Number(input[j].split(' // ')[1].slice(-5,-2).trim())
                thisMeeting.startH = shour
                thisMeeting.startM = smin
                thisMeeting.start = shour + ':' + smin
            }
            
            // turn end time into 24 hour
            if (input[j].split(' // ')[2].slice(-2) == 'PM') {
                var ehour = Number(input[j].split(' // ')[2].slice(-8,-6).trim()) + 12
                var emin = Number(input[j].split(' // ')[2].slice(-5,-2).trim())
                thisMeeting.endH = ehour
                thisMeeting.endM = emin
                thisMeeting.end = ehour + ':' + emin
            } else {
                var ehour = Number(input[j].split(' // ')[2].slice(-8,-6).trim())
                var emin = Number(input[j].split(' // ')[2].slice(-5,-2).trim())
                thisMeeting.endH = ehour
                thisMeeting.endM = emin
                thisMeeting.end = ehour + ':' + emin
            }
            
            // input meeting type
            thisMeeting.type = input[j].split(' // ')[4].trim()
            
            // input special interest
            if (input[j].split(' // ')[5] == undefined) {
                thisMeeting.interest = 'No Special Interest'
            } else {
                thisMeeting.interest = input[j].split(' // ')[5]
            }
            
            output.push(thisMeeting);
        }
    return output;
    }
}


// ----------------------- LOCATIONS API -----------------------
// get the location details through the google API

function api() {
    
    async.eachSeries(address, function(value, callback) {
        if (value === '550 West 155th Street 2nd Floor Guild Room') {
            value = '550 West 155th Street' }
        if (value === '178 Bennett Avenue 2nd Floor (Lorenz Library)') {
            value = '178 Bennett Avenue' }
        if (value === '178 Bennett Avenue Kitchen') {
            value = '178 Bennett Avenue' }
        if (value === '189th Street & Bennett Avenue Kitchen') {
            value = '189th Street and Bennett Avenue' }
            
        var apiRequest = 
            'https://maps.googleapis.com/maps/api/geocode/json?address=' 
            + value.split(' ').join('+')
            + 'New+York+NY'
            + '&key='
            + apiKey;
        var thisMeeting = new Object;
        
        thisMeeting.address = value;
        
        request(apiRequest, function(err, resp, body) {
            if (err) {throw err;}
            thisMeeting.lat = JSON.parse(body)
                .results[0]
                .geometry
                .location
                .lat;
            thisMeeting.long = JSON.parse(body)
                .results[0]
                .geometry
                .location
                .lng;
            thisMeeting.formattedAddress = JSON.parse(body)
                .results[0]
                .formatted_address;
            
            addressData.push(thisMeeting);
        });
        setTimeout(callback, 200);
    }, function() {
        fs.writeFileSync('addressdata.txt', JSON.stringify(addressData));
    });
}


// ----------------------- JSON NOTATION -----------------------
// create the final JSON notation with meeting array, location, 
// and other details

function jsonNotation() {
    
    var addressData = fs.readFileSync('addressdata.txt');
    var addressDataParsed = JSON.parse(addressData);
    
    for (i=0; i<22; i++) {
        
        var thisLocation = new Object;
        
        thisLocation.groupName = leftCol[i][1];
        thisLocation.address = address[i];
        thisLocation.lat = addressDataParsed[i].lat;
        thisLocation.long = addressDataParsed[i].long;
        thisLocation.notes = leftCol[i][4];
        thisLocation.wheelchair = leftCol[i][5];
        thisLocation.meetings = details[i];
        
        jsonMeetings.push(thisLocation);
    }
console.log(jsonMeetings)
}

// ----------------------- MONGO -----------------------
// add the compiled json objects to mongo db

function addToMongo() {
    var dbName = 'aa_group_meetings';
    // var groupNamesColl = 'group_names'; 
    var meetingsColl = 'meetings';

    request(jsonMeetings, function(error, response, body) {

        var url = 'mongodb://' + process.env.IP + ':27017/' + dbName;
        var MongoClient = require('mongodb').MongoClient;
        MongoClient.connect(url, function(err, db) {
            if (err) { return console.dir(err); }
            var collection = db.collection(meetingsColl);
            collection.insert(jsonMeetings);
            db.close();
            
        });
    });
}