// ==UserScript==
// @name        MusicBrainz: Archive.org importer
// @namespace   http://www.jens-bertram.net/userscripts/import-internetarchive
// @description Import audio files and collections into Musicbrainz. Also supports scanning bookmarks and search results for MusicBrainz relations.
// @icon				http://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Internet_Archive_logo_and_wordmark.png/240px-Internet_Archive_logo_and_wordmark.png
// @include     *://archive.org/details/*
// @include			*://archive.org/bookmarks.php
// @include			*//archive.org/search.php*
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @require     https://greasyfork.org/scripts/5140-musicbrainz-function-library/code/MusicBrainz%20function%20library.js
// @version     0.3.0beta
// @grant       none
// @supportURL  https://github.com/JensBee/userscripts
// @license     MIT
// ==/UserScript==
var mbz = mbz || {};
mbz.archive_org_importer = {
  // https://archive.org/about/faqs.php#Audio
  audioFormats: [
    'mp3',
    'flac',
    'ogg',
    'audio',
    'aiff',
    'shorten',
    'weba'],

  /**
    * Insert a link, if a release has MusicBrainz relations.
    * @data key=mbid value=string array: relation types
    * @target target jQuery element to append (optional) or this.bmLinkTarget set in scope
    */
  insertMBLink: function(data, target) {
    if (data) {
      var self = this;
      target = target || self.mbLinkTarget;
      if (!target) {
        return;
      }
      $.each(data, function(k, v) {
        if (!k.startsWith('_')) { // skip internal data
          var relLink = MBZ.Html.getLinkElement({
            type: 'release',
            id: k,
            title: "Linked as: " + v.toString(),
            before: '&nbsp;'
          });
          target.after(relLink);
          var editLink = MBZ.Html.getLinkElement({
            type: 'release',
            id: k,
            more: 'edit',
            text: 'edit',
            title: 'Edit release',
            before: ', ',
            icon: false
          });
          var artLinkTitle = 'set';
          $.ajax({
            url: MBZ.CA.getLink({
              type: 'release',
              id: k,
              more: 'front'
            })
          }).success(function(){
            artLinkTitle = 'edit';
          }).always(function() {
            var artLink = MBZ.Html.getLinkElement({
              type: 'release',
              id: k,
              more: 'cover-art',
              text: artLinkTitle + ' art',
              title: artLinkTitle + ' cover art for release',
              before: ', ',
              icon: false
            });
            relLink.after('<sup> ' + v.length + editLink.html() + artLink.html() + '</sup>');
          });
        }
      });
    }
  },

  /**
    * Check file type for audio format.
    * @formatStr file format name
    */
  isAudioFile: function(formatStr) {
    formatStr = formatStr.toLowerCase();
    for (format in this.audioFormats) {
      if (formatStr.contains(format)) {
        return true;
      }
    }
    return false;
  }
};

/**
  * Functions to parse a list of links for MusicBrainz relations.
  */
mbz.archive_org_importer.linkCheck = {
  btn: MBZ.Html.getMbzButton('Check link relations', 'Check entries being linked from MusicBrainz.'),

  /**
    * Link scanner status values
    */
  links: {
    found: null,
    checked: 0,
    matched: 0
  },

  /**
    * RexEx to strip off current base-url.
    */
  re: new RegExp('^'+window.location.origin),

  /**
    * Scan status elements.
    */
  status: {
    base: $('<span>'),
    current: $('<span>'),
    matched: $('<span>')
  },

  /**
    * Start scanner.
    *	@params[links] jQuery object with target links
    * @params[controlEl] jQuery element to append controls to
    */
  scan: function(params) {
    this.links.found = params.links;

    if (this.links.found.length > 0 && params.controlEl) {
      var self = this;
      //var cEl = $('<div id="mbzControls">');

      this.status.current.text(this.links.checked);
      this.status.matched.text(this.links.matched);
      this.status.base.append('&nbsp;Checked: ')
        .append(this.status.current)
        .append('&nbsp;Matches: ')
        .append(this.status.matched)
        .hide();

      this.btn.click(function () {
        self.btn.prop("disabled", true);
        self.btn.text("Checking..");
        self.status.base.show();
        var urls = [];
        $.each(self.links.found, function(idx, link) {
          urls.push('http://archive.org'+$(link).attr('href'));
        });
        MBZ.Release.getUrlRelations({
          urls: MBZ.Util.expandProtocols(urls),
          cb: self.rel.attach,
          cbInc: self.rel.inc,
          cbDone: self.rel.done,
          scope: self
        });
      });
      //cEl.append(this.btn).append(this.status.base);
      params.controlEl.append(this.btn).append(this.status.base);
    }
  },

  /**
    * Callback handlers for relation parsing.
    */
  rel: {
    /**
      * Relation was found, data is attached.
      */
    attach: function(data) {
      if (!data._res) {
        return;
      }
      var res = data._res.replace(this.re, '');
      var self = this;
      $.each(self.links.found, function(idx, link) {
        var link = $(link);
        if (link.attr('href') == res) {
          self.status.matched.text(self.links.matched++);
          mbz.archive_org_importer.insertMBLink(data, link);
        }
      });
    },

    /**
      * All relations have been resolved.
      */
    done: function() {
      this.status.base.html('&nbsp;' + this.links.checked + ' links checked with ' + this.links.matched + ' matches.');
      this.btn.text('Check done');
    },

    /**
      * A relation was checked.
      */
    inc: function() {
      this.status.current.text(this.links.checked++);
    },
  }
}

/**
  * Functions to import a single release.
  */
mbz.archive_org_importer.release = {
  btn: MBZ.Html.getMbzButton('Import', 'Import this release to MusicBrainz'),
  mbLinkTarget: null,

  /**
    * Initialize release parsing.
    */
  init: function() {
    var playerJSON = $('#midcol > script').text().trim().match(/Play\([\s\S]*?\[([\s\S]*)\]/);
    if (!playerJSON) {
      console.error('Player JSON data not found. Disabling MusicBrainz import.');
      return;
    }
    var self = this;
    var cEl = $('<div id="mbzControls">');
    var url = MBZ.Util.rmTrSlash($(location).attr('href'));
    var urlJSON = url + '&output=json';
    var trackData = $.parseJSON('[' + playerJSON[1] + ']');

    this.btn.click(function () {
      self.btn.prop("disabled", true);
      self.btn.text("Import running..");
      // *** static data
      self.release.addMedium({
        idx: 0,
        fmt: 'Digital Media'
      });
      self.release.setPackaging('none');
      self.release.setNote('Imported from The Internet Archive (' + url + ')');
      // *** parsed data from player JSON object
      self.parseJSON.tracks.call(self, trackData);
      // *** parsed data from release JSON object
      $.getJSON(urlJSON, function (data) {
        self.parseJSON.urls.call(self, data);
        self.parseJSON.artists.call(self, data);
        self.parseJSON.title.call(self, data);
        self.parseJSON.labels.call(self, data);
        self.parseJSON.release.call(self, data);
        self.parseJSON.annotation.call(self, data);
      }).fail(function(jqxhr, textStatus, error) {
        var err = textStatus + ', ' + error;
        console.error("Request (" + urlJSON + ") failed: " + err);
      }).always(function() {
        // submit
        self.release.submitRelease();
        self.btn.text("Data submitted");
      });
    });
    $('.breadcrumbs').before(cEl.append(this.btn));
    self.mbLinkTarget = self.btn;
    MBZ.Release.getUrlRelations({
      urls: MBZ.Util.expandProtocol(url),
      cb: mbz.archive_org_importer.insertMBLink,
      scope: self
    });
  },

  /**
    * Parse JSON response for a release.
    */
  parseJSON: {
    annotation: function (data) {
      if (data.metadata.notes) {
        this.release.setAnnotation(data.metadata.notes[0]);
      }
    },
    artists: function (data) {
      if (data.metadata.creator) {
        var self = this;
        $.each(data.metadata.creator, function (idx, val) {
          self.release.addArtist(val);
        });
      }
    },
    labels: function (data) {
      if (data.metadata.collection) {
        var self = this;
        $.each(data.metadata.collection, function (idx, val) {
          self.release.addLabel({
            name: val,
            catNo: data.metadata.identifier[0]
          });
        });
      }
    },
    release: function (data) {
      var dates = data.metadata.date || data.metadata.publicdate;
      if (dates) {
        var self = this;
        $.each(dates, function (idx, val) {
          var date = val.match(/([0-9]{4})-([0-9]{2})-([0-9]{2}).*/);
          if (date.length == 4) {
            self.release.addRelease({
              y: date[1],
              m: date[2],
              d: date[3],
              cc:'XW'
            });
          }
        });
      }
    },
    urls: function (data) {
      var url = $(location).attr('href');
      this.release.addUrl(url, '75');
      this.release.addUrl(url, '85');
      if (data.creativecommons.license_url) {
        this.release.addUrl(data.creativecommons.license_url, '301');
      }
    },
    title: function (data) {
      if (data.metadata.title) {
        this.release.setTitle(data.metadata.title[0]);
      }
    },
    tracks: function (data) {
      if (data.length > 0) {
        var self = this;
        $.each(data, function(idx, val){
          var duration = MBZ.Util.hmsToSeconds(val.duration);
          duration = Math.round(parseFloat(duration) * 1000); // sec to msec
          if (isNaN(duration)) {
            duration = null;
          }

          self.release.addTrack({
            med: 0,
            tit: val.title.replace(/^[0-9]+\.\s/,''),
            idx: idx,
            dur: duration
          });
        });
      }
    }
  },

  release: new MBZ.Release()
};

mbz.archive_org_importer.init = function() {
  var pageType = window.location.pathname.split('/');
  if (pageType.length >= 2) {
    pageType = pageType[1].toLowerCase()
  } else {
    return;
  }

  if (pageType == 'details' && $('body').hasClass('Audio')) {
    // import a release
    mbz.archive_org_importer.release.init();
  } else if (pageType == 'bookmarks.php') {
    // check all bookmarks for MusicBrainz relations
    var links = $('.box>table>tbody a').filter(function(idx) {
      // no way to check type for audio here
      return $(this).attr('href').startsWith('/details/');
    });
    var control = $('<div id="mbzControls">');
    $('.box>h1').after(control);
    if (links.length > 0) {
      mbz.archive_org_importer.linkCheck.scan({
        links: links,
        controlEl: control
      });
    }
  } else if (pageType == 'search.php') {
    var links = [];
    // check audio links for MusicBrainz relations
    var audioItems = $('.numberCell>img[alt="[audio]"]').filter(function(idx) {
      // get the first linked audio item..
      var el = $(this).parent().next().children('a')[0];
      if (el) {
        el = $(el);
        if (el.attr('href').startsWith('/details/')) {
          // ..and extract it's url
          links.push(el);
        }
      }
    });
    var control = $('<div>');
    var col = $('<td colspan="2">');
    col.append(control);
    var row = $('<tr>').append(col);
    $('.resultsTable').prepend(row);
    if (links.length > 0) {
      mbz.archive_org_importer.linkCheck.scan({
        links: links,
        controlEl: control
      });
    }
  }
};

mbz.archive_org_importer.init();
