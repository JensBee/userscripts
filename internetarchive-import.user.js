// ==UserScript==
// @name        MusicBrainz: Archive.org importer
// @namespace   http://www.jens-bertram.net/userscripts/import-internetarchive
// @description Import audio files and collections into Musicbrainz.
// @include     *://archive.org/details/*
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @require     https://greasyfork.org/scripts/5140-musicbrainz-function-library/code/MusicBrainz%20function%20library.js
// @version     0.2.3beta
// @grant       none
// @supportURL  https://github.com/JensBee/userscripts
// @license     MIT
// ==/UserScript==
var release = new MBZ.Release();
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
      release.setAnnotation(data.metadata.notes[0]);
    }
  },
  artists: function (data) {
    if (data.metadata.creator) {
      $.each(data.metadata.creator, function (idx, val) {
        release.addArtist(val);
      });
    }
  },
  labels: function (data) {
    if (data.metadata.collection) {
      $.each(data.metadata.collection, function (idx, val) {
        release.addLabel(val, data.metadata.identifier[0]);
      });
    }
  },
  release: function (data) {
    var dates = data.metadata.date || data.metadata.publicdate;
    if (dates) {
      $.each(dates, function (idx, val) {
        var date = val.match(/([0-9]{4})-([0-9]{2})-([0-9]{2}).*/);
        if (date.length == 4) {
          release.addRelease(date[1], date[2], date[3], 'XW');
        }
      });
    }
  },
  urls: function (data) {
    var url = $(location).attr('href');
    release.addUrl(url, '75');
    release.addUrl(url, '85');
    if (data.creativecommons.license_url) {
      release.addUrl(data.creativecommons.license_url, '301');
    }
  },
  title: function (data) {
    if (data.metadata.title) {
      release.setTitle(data.metadata.title[0]);
    }
  },
  tracks: function (data) {
    var tracks = {
    };
    var trackCount = 0;
    if (data.files) {
      $.each(data.files, function (idx, val) {
        var title = val.title;
        if (isAudioFile(val.format) && title) {
          var ttime = 'NaN';
          if (val['length']) {
            if (val['length'].indexOf('.') > - 1) {
              // length expressed in seconds
              ttime = val['length'];
            } else if (val['length'].indexOf(':') > - 1) {
              // length expressed in HH:MM:SS
              ttime = MBZ.hmsToSeconds(val['length']);
            }
            ttime = Math.round(parseFloat(ttime) * 1000); // sec to msec
          }
          var track = (parseInt(val.track) - 1); // count starts at 1, on MB at 0
          if (isNaN(track)) {
            track = trackCount + 1;
          }
          if (release.addTrack(0, title, track, ttime) == 1) {
            trackCount++;
          }
        }
      });
    }
  }
};
if ($('body').hasClass('Audio')) { // basic data type check
  $.getJSON($(location).attr('href') + '&output=json', function (data) {
    // additional data type check
    if (data.metadata.mediatype[0] == 'audio') {
      var btn = $('<button type="button">MusicBrainz import</button>');
      btn.click(function () {
        release.submitRelease();
      });
      $('.breadcrumbs').append('&nbsp;').append(btn);
      // *** static data
      release.addMediumFormat(0, 'Digital Media');
      release.setPackaging('none');
      release.setNote('Imported from The Internet Archive (' + $(location).attr('href') + ')');
      // *** parsed data
      parse.urls(data);
      parse.artists(data);
      parse.title(data);
      parse.labels(data);
      parse.release(data);
      parse.annotation(data);
      parse.tracks(data);
    }
    //release.dump();
  });
}
