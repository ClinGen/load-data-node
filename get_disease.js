#!/usr/bin/env node

var fs = require('fs');
var xml2json = require('xml2json');
var util = require('util');
var _ = require('underscore');
var Promise = require('bluebird');
var MongoClient = Promise.promisify(require('mongodb').MongoClient);

var url = 'mongodb://localhost:27017/Spindle';

// Grab the path from the command line
var path = process.argv.slice(2)[0];
if (!path) {
    util.log('Must specify an XML file as a source.');
    return;
}

// Read from the specified file tin xmlData
try {
    var xmlData = fs.readFileSync(path, {encoding: 'UTF-8'});
} catch(err) {
    util.log(err);
    return;
}
if (!xmlData) {
    util.log('Could not read from the file ' + path);
    return;
}

// Convert from XML to JSON in data
var data = xml2json.toJson(xmlData, {object: true});

MongoClient.connectAsync(url).then(function(db) {
    var coll = db.collection('Disease2');
    var bulk = coll.initializeUnorderedBulkOp();
    data.JDBOR.DisorderList.Disorder.forEach(function(disorder) {
        var disease = {};
        disease.ORDOID = disorder.OrphaNumber;
        disease.FullName = disorder.Name.$t;
        disease.Type = disorder.DisorderType.Name.$t;
        disease.Active = "Yes";

        // Build array of synonyms
        if (disorder.SynonymList.count > 1) {
            // More than one synonym; pull each array item
            disease.Synonym = disorder.SynonymList.Synonym.map(function(synonym) {
                return synonym.$t;
            });
        } else if (disorder.SynonymList.count === 1) {
            // Only one synonym; convert single object to single-item array
            disease.Synonym = [disorder.SynonymList.Synonym.$t];
        }

        // Build array of OMIMID
        if (disorder.ExternalReferenceList.count > 1) {
            // More than one external reference; pull each array item with a source of OMIM
            var omimids = _(disorder.ExternalReferenceList.ExternalReference).filter(function(ref) {
                return ref.Source === 'OMIM';
            }).map(function(ref) {
                return ref.Reference;
            });
            if (omimids && omimids.length) {
                disease.OMIMID = omimids;
            }
        } else if (disorder.ExternalReferenceList.count === 1) {
            // Only one external reference; convert item to array if source is OMIM
            if (disorder.ExternalReferenceList.ExternalReference.Source === 'OMIM') {
                disease.OMIMID = [disorder.ExternalReferenceList.ExternalReference.Reference];
            }
        }

        bulk.insert(disease);
    });
    return bulk;
}).then(function(bulk) {
    // Write the queued documents to the database.
    bulk.executeAsync().then(function() {
        db.close();
    }
});

// Connect to the Spindle database and write the data
MongoClient.connect(url, function(err, db) {
    if (err === null) {
        var coll = db.collection('Disease2');
        var bulk = coll.initializeUnorderedBulkOp();
        data.JDBOR.DisorderList.Disorder.forEach(function(disorder) {
            var disease = {};
            disease.ORDOID = disorder.OrphaNumber;
            disease.FullName = disorder.Name.$t;
            disease.Type = disorder.DisorderType.Name.$t;
            disease.Active = "Yes";

            // Build array of synonyms
            if (disorder.SynonymList.count > 1) {
                // More than one synonym; pull each array item
                disease.Synonym = disorder.SynonymList.Synonym.map(function(synonym) {
                    return synonym.$t;
                });
            } else if (disorder.SynonymList.count === 1) {
                // Only one synonym; convert single object to single-item array
                disease.Synonym = [disorder.SynonymList.Synonym.$t];
            }

            // Build array of OMIMID
            if (disorder.ExternalReferenceList.count > 1) {
                // More than one external reference; pull each array item with a source of OMIM
                var omimids = _(disorder.ExternalReferenceList.ExternalReference).filter(function(ref) {
                    return ref.Source === 'OMIM';
                }).map(function(ref) {
                    return ref.Reference;
                });
                if (omimids && omimids.length) {
                    disease.OMIMID = omimids;
                }
            } else if (disorder.ExternalReferenceList.count === 1) {
                // Only one external reference; convert item to array if source is OMIM
                if (disorder.ExternalReferenceList.ExternalReference.Source === 'OMIM') {
                    disease.OMIMID = [disorder.ExternalReferenceList.ExternalReference.Reference];
                }
            }

            bulk.insert(disease);
        });

        // Write the queued documents to the database.
        bulk.execute(function(err, res) {
            if (err) {
                console.log('ERROR: ' + err);
            } else {
                console.log('Completed writing collection successfully');
            }
            db.close();
        });
    } else {
        console.log('Could not connect to database: ' + err);
    }
});
