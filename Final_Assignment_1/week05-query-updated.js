var fs = require('fs');

var dbName = 'aa_group_meetings'; 
var groupNamesColl = 'group_names'; 
var meetingsColl = 'meetings'; 

// Connection URL
var url = 'mongodb://' + process.env.IP + ':27017/' + dbName;

// Retrieve
var MongoClient = require('mongodb').MongoClient;

MongoClient.connect(url, function(err, db) {
    if (err) {return console.dir(err);}

    var collection = db.collection(meetingsColl);
    var my_query = [
      { $match : { $and: [{"meetings.day":"Tuesday"} , {$or: [ { $and: [{"meetings.startH":19} , 
      {"meetings.startM":30}] } , { "meetings.startH": { $gt: 19 } } ] } ] } } 
      ];
    
    collection.aggregate(my_query).toArray(function(err, docs) {
        if (err) {console.log(err)}
        
        else {
            console.log("Writing", docs.length, "documents as a result of this aggregation.");
            fs.writeFileSync('mongo_aggregation_result.JSON', JSON.stringify(docs, null, 4));
        }
        db.close();
        
    });

});