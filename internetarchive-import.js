// ==UserScript==
// @name        MusicBrainz: Archive.org importer
// @namespace   http://www.jens-bertram.net/userscripts/import-internetarchive
// @description Import audio files and collections into Musicbrainz.
// @include     *://archive.org/details/*
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @version     0.1beta
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
// basic data type check

if ($('body').hasClass('Audio')) {
  $('body').append(form);
  $.getJSON($(location).attr('href') + '&output=json', function (data) {
    console.log(data);
    // additional data type check
    if (data.metadata.mediatype[0] == 'audio') {
      var btn = $('<button type="button">MusicBrainz import</button>');
      btn.click(function () {
        $('#mbImport').submit()
      });
      $('.breadcrumbs').append('&nbsp;').append(btn);
      addField('packaging', 'none');
      // urls
      var url = $(location).attr('href');
      addField('urls.0.url', url);
      addField('urls.0.link_type', '75'); // download for free
      addField('urls.1.url', url);
      addField('urls.1.link_type', '85'); // stream for free
      if (data.creativecommons.license_url) {
        addField('urls.2.url', data.creativecommons.license_url);
        addField('urls.2.link_type', '301'); // license
      }
      // artist(s)

      $.each(data.metadata.creator, function (idx, val) {
        addField('artist_credit.names.' + idx + '.name', val);
      });
      // title
      addField('name', data.metadata.title[0]);
      // label(s)
      $.each(data.metadata.collection, function (idx, val) {
        addField('labels.' + idx + '.name', val);
        addField('labels.' + idx + '.catalog_number', data.metadata.identifier[0]);
      });
      // release date(s)
      $.each(data.metadata.date, function (idx, val) {
        var dateArr = val.split(/-/);
        if (dateArr.length == 3) {
          var prefix = 'events.' + idx + '.';
          addField(prefix + 'date.year', dateArr[0]);
          addField(prefix + 'date.month', dateArr[1]);
          addField(prefix + 'date.day', dateArr[2]);
          addField(prefix + 'country', 'XW'); // worldwide
        }
      });
      // annotation
      addField('annotation', data.metadata.notes[0], true);
      // medium
      addField('mediums.0.format', 'Digital Media'); // digital media
      // tracks
      $.each(data.files, function (idx, val) {
        if (val.source == 'original') {
          var track = (parseInt(val.track) - 1); // count starts at 1, on MB at 0
          if (!isNaN(track)) {
            var prefix = 'mediums.0.track.' + track + '.';
            var title = val.title;
            var length = Math.round(parseFloat(val.length) * 1000);
            if (title && !isNaN(length)) {
              addField(prefix + 'name', title);
              addField(prefix + 'length', length);
            }
          }
        }
      });
      // note
      addField('edit_note', 'Imported from The Internet Archive ('+url+')');
    }
  });
}
