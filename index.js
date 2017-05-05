const fs = require('fs');
const cheerio = require('cheerio');

// downloaded suggestions from City Namer
var suggestions = require('./suggestions.json');

var $ = cheerio.load('<html><head><meta charset="utf-8"/><title>Nepalese Bot Preview</title><link rel="stylesheet" href="results.css"/></head><body><h2>Nepalese Bot Results</h2><div class="confirmed"><h3>Matches</h3></div></body></html>')
var confirmed = $('.confirmed');

suggestions = suggestions.sort(function(a, b) {
  return a.osm_place_id * 1 - b.osm_place_id * 1;
});

var previousNodes = {};

var writeNode = function(node_id, suggestion) {
  var suggestedNames = Object.keys(previousNodes[node_id]).sort(function(a, b) {
    return previousNodes[node_id][b] - previousNodes[node_id][a];
  });
  //console.log(suggestedNames + ' ' + previousNodes[node_id][suggestedNames[0]]);
  var top_name = suggestedNames[0];

  var node = $('<li>')
    .append(
      $('<a>')
        .attr('href', 'https://www.openstreetmap.org/node/' + suggestion.osm_place_id)
        .text(suggestion.originalName)
    ).append(
      $('<span>')
        .text('will be named ' + top_name + ' with ' + previousNodes[node_id][top_name] + ' votes.')
    );
  confirmed.append(node);
};

var suggestion, osm_id, target_language, suggested_name;
var previous_id = null;
var previous_suggestion = null;

for (var i = 0; i < suggestions.length; i++) {
  suggestion = suggestions[i];
  osm_id = suggestion.osm_place_id;
  if (!previousNodes[osm_id]) {
    previousNodes[osm_id] = {};
    if (previous_id) {
      writeNode(previous_id, previous_suggestion);
    }
  }
  previous_id = null;
  previous_suggestion = null;
  target_language = suggestion.targetLanguage;
  suggested_name = suggestion.suggested;

  // remove non-Devanagari letters, and extraneous spaces
  suggested_name = suggested_name.replace(/[\u0021-\u08FF\u0A00-\uFFFF]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
    
  // filter out data which wasn't Devanagari script
  if (!suggested_name.length) {
    continue;
  }
  
  // filter out initial test data which wasn't tied to a specific OSM ID
  if (isNaN(osm_id * 1) || osm_id * 1 <= 10) {
    continue;
  }

  // filter out any non-Nepali projects
  if (target_language !== 'ne') {
    console.log('not a Nepali name');
    continue;
  }
  
  if (!previousNodes[osm_id][suggested_name]) {
    previousNodes[osm_id][suggested_name] = 1;
  } else {
    previousNodes[osm_id][suggested_name]++;
  }
  
  previous_id = osm_id;
  previous_suggestion = suggestion;
}
if (previous_id) {
  writeNode(previous_id, previous_suggestion);
}


fs.writeFile('./results.html', $.html(), (err) => {
  if (err) {
    throw err;
  }
  console.log('output finished');
});