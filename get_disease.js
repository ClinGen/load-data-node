#!/usr/bin/env node

var fs = require('fs');
var xml2json = require('xml2json');
var util = require('util');
var _ = require('underscore');
var MongoClient = require('mongodb').MongoClient;

var url = 'mongodb://localhost:27017/Spindle';

// Grab the path from the command line
var path = process.argv.slice(2)[0];
if (!path) {
    util.log('Must specify an XML file as a source.');
    return;
}

// Read from the specified file
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

// Convert from XML to JSON
var data = xml2json.toJson(xmlData, {object: true});
//console.log("%o", data.JDBOR.DisorderList.Disorder);

MongoClient.connect(url, function(err, db) {
    if (err === null) {
        data.JDBOR.DisorderList.Disorder.forEach(function(disorder) {
            var disease = {};
            disease.ORDOID = disorder.OrphaNumber;
            disease.FullName = disorder.Name.$t;

            // Build array of synonyms
            if (disorder.SynonymList.count > 1) {
                disease.Synonym = disorder.SynonymList.Synonym.map(function(synonym) {
                    return synonym.$t;
                });
            } else if (disorder.SynonymList.count === 1) {
                disease.Synonym = [disorder.SynonymList.Synonym.$t];
            }

            // Build array of OMIMID
            if (disorder.ExternalReferenceList.count > 1) {
                disease.OMIMID = _(disorder.ExternalReferenceList.ExternalReference).filter(function(ref) {
                    return ref.Source === 'OMIM';
                }).map(function(ref) {
                    return ref.Reference;
                });
            } else if (disorder.ExternalReferenceList.count === 1) {
                if (disorder.ExternalReferenceList.ExternalReference.Source === 'OMIM') {
                    disease.OMIMID = [disorder.ExternalReferenceList.ExternalReference.Reference];
                }
            }

            disease.Type = disorder.DisorderType.Name.$t;

            console.dir(disease);
//            db.collection('Disease').insertOne(
//                {"name": "Juni"},
//                function(err, results) {
//                    console.log(results);
//                    callback();
//                }
//            );
        });
    } else {
        console.log(err);
    }
});
