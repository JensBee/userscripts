// ==UserScript==
// @name        MusicBrainz: Archive.org importer
// @namespace   http://www.jens-bertram.net/userscripts/import-internetarchive
// @description Import audio files and collections into Musicbrainz.
// @include     *://archive.org/details/*
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @version     0.2.1beta
// @grant       none
// @supportURL  https://github.com/JensBee/userscripts
// @license     MIT
// ==/UserScript==
var form = $('<form method="post" id="mbImport" target="_blank" action="https://musicbrainz.org/release/add" acceptCharset="UTF-8"></form>');
function addField(name, value, escape) {
  if (escape) {
    form.append($('<input type="hidden" name="' + name + '" value="' +
    value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    + '"/>'));
  } else {
    form.append($('<input type="hidden" name="' + name + '" value="' + value + '"/>'));
  }
}
function isAudioFile(formatStr) {
  // https://archive.org/about/faqs.php#Audio
  var formats = [
    'mp3',
    'flac',
    'ogg',
    'audio',
    'aiff',
    'shorten',
    'weba'
  ];
  formatStr = formatStr.toLowerCase();
  for (format in formatStr) {
    if (formatStr.contains(format)) {
      return true;
    }
  }
  return false;
}
var parse = {
  annotation: function (data) {
    if (data.metadata.notes) {
      console.log('+annotation');
      addField('annotation', data.metadata.notes[0], true);
    } else {
      console.log('-annotation');
    }
  },
  artists: function (data) {
    if (data.metadata.creator) {
      console.log('+artists');
      $.each(data.metadata.creator, function (idx, val) {
        addField('artist_credit.names.' + idx + '.name', val);
      });
    } else {
      console.log('-artists');
    }
  },
  labels: function (data) {
    if (data.metadata.collection) {
      console.log('+labels');
      $.each(data.metadata.collection, function (idx, val) {
        addField('labels.' + idx + '.name', val);
        addField('labels.' + idx + '.catalog_number', data.metadata.identifier[0]);
      });
    } else {
      console.log('-labels');
    }
  },
  release: function (data) {
    var dates = data.metadata.date || data.metadata.publicdate;
    if (dates) {
      console.log('+release');
      $.each(dates, function (idx, val) {
        var date = val.match(/([0-9]{4})-([0-9]{2})-([0-9]{2}).*/);
        if (date.length == 4) {
          var prefix = 'events.' + idx + '.';
          addField(prefix + 'date.year', date[1]);
          addField(prefix + 'date.month', date[2]);
          addField(prefix + 'date.day', date[3]);
          addField(prefix + 'country', 'XW'); // worldwide
        }
      });
    } else {
      console.log('-release');
    }
  },
  urls: function (data) {
    console.log('+urls');
    var url = $(location).attr('href');
    addField('urls.0.url', url);
    addField('urls.0.link_type', '75'); // download for free
    addField('urls.1.url', url);
    addField('urls.1.link_type', '85'); // stream for free
    if (data.creativecommons.license_url) {
      addField('urls.2.url', data.creativecommons.license_url);
      addField('urls.2.link_type', '301'); // license
    }
  },
  title: function (data) {
    if (data.metadata.title) {
      console.log('+title');
      addField('name', data.metadata.title[0]);
    } else {
      console.log('-title');
    }
  },
  tracks: function (data) {
    var tracks = {
    };
    var trackCount = 0;
    if (data.files) {
      console.log('+tracks');
      $.each(data.files, function (idx, val) {
        var title = val.title;
        if (isAudioFile(val.format) && title) {
          var length = Math.round(parseFloat(val.length) * 1000);
          var track = (parseInt(val.track) - 1); // count starts at 1, on MB at 0
          if (isNaN(track)) {
            track = trackCount + 1;
          }
          if ((tracks[title] && isNaN(tracks[title])) || (!tracks[title])) {
            tracks[title] = {
              num: track,
              length: length
            };
            trackCount++;
          }
        }
      });
      var trackCount = 0;
      for (var title in tracks) {
        if (tracks.hasOwnProperty(title)) {
          var prefix = 'mediums.0.track.' + tracks[title].num + '.';
          addField(prefix + 'name', title);
          var length = tracks[title].length;
          if (!isNaN(length)) {
            addField(prefix + 'length', tracks[title].length);
          }
          trackCount++;
        }
      }
    } else {
      console.log('-tracks');
    }
  }
};
if ($('body').hasClass('Audio')) { // basic data type check
  $('body').append(form);
  $.getJSON($(location).attr('href') + '&output=json', function (data) {
    // console.log(data);
    // additional data type check
    if (data.metadata.mediatype[0] == 'audio') {
      var btn = $('<button type="button">MusicBrainz import</button>');
      btn.click(function () {
        $('#mbImport').submit()
      });
      $('.breadcrumbs').append('&nbsp;').append(btn);
      // *** static data
      addField('mediums.0.format', 'Digital Media'); // digital media
      addField('packaging', 'none');
      addField('edit_note', 'Imported from The Internet Archive (' + $(location).attr('href') + ')');
      // *** parsed data
      parse.urls(data);
      parse.artists(data);
      parse.title(data);
      parse.labels(data);
      parse.release(data);
      parse.annotation(data);
      parse.tracks(data);
    }
  });
}
