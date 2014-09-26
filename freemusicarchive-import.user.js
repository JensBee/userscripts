// ==UserScript==
// @name        MusicBrainz: FreeMusicArchive.org importer
// @namespace   http://www.jens-bertram.net/userscripts/import-fma
// @description Import releases from Free Music Archive
// @supportURL  https://github.com/JensBee/userscripts
// @license     MIT
// @version     0.1beta
//
// @grant       none
// @require     https://greasyfork.org/scripts/5140-musicbrainz-function-library/code/MusicBrainz%20function%20library.js
//
// @include     *://*.freemusicarchive.org/music/*
// @include     *://freemusicarchive.org/music/*
// ==/UserScript==
var mbz = mbz || {};
mbz.freemusicarchive_org_importer = {};

mbz.freemusicarchive_org_importer.release = {
  btn: MBZ.Html.getMbzButton('Import', 'Import this release to MusicBrainz'),
  mbLinkTarget: null,

  init: function() {
    var self = this;
    var url = MBZ.Util.rmTrSlash($(location).attr('href'));
    this.btn.css({
      marginBottom: '0.5em'
    });
    this.btn.click(function () {
      self.btn.prop("disabled", true);
      self.btn.text("Import running..");
      // *** static data
      self.release.addMedium({
        idx: 0,
        fmt: 'Digital Media'
      });
      self.release.setPackaging('none');
      self.release.setNote('Imported from the Free Music Archive (' + url + ')');
      // *** parsed data from page content
      // title
      self.release.setTitle($('.txthd2').text());
      // release date
      var upDate = $('.sbar-stat.first-stat>b').text().split('/');
      if (upDate.length == 3) {
        self.release.addRelease({
          y: upDate[2],
          m: upDate[0],
          d: upDate[1],
          cc:'XW'
        });
      }
      // label
      self.release.addLabel({
        name: $('.sbar-stat>b>a').text()
      });
      // links
      var audioUrl = $('.sqbtn-downloadalbumarrow').attr('href');
      self.release.addUrl(audioUrl, '75');
      self.release.addUrl(audioUrl, '85');
      // tracks
      $.each($('.play-item'), function (idx, val) {
        var tLength =  $(val).children('.playtxt').clone().children().remove().end().text().match(/([0-9]+:[0-9]+)/);
        if (tLength) {
          tLength = MBZ.Util.hmsToSeconds(tLength[0]) * 1000;
        }
        self.release.addTrack({
          med: 0,
          tit: $(val).children('.playtxt').children('a').eq(1).text().trim(),
          idx: idx,
          dur: tLength
        });
      });
      // *** submit
      self.release.submitRelease();
      self.btn.text("Data submitted");
    });
    $('.colr-sml-toppad').eq(0).prepend(this.btn);
    this.mbLinkTarget = this.btn;
    MBZ.Release.getUrlRelation({
      urls: url,
      cb: MBZ.Release.insertMBLink,
      scope: self
    });
  },

  release: new MBZ.Release()
};

mbz.freemusicarchive_org_importer.init = function() {
  var pageType = window.location.pathname.split('/');
  if (pageType.length >= 2) {
    pageType = pageType[1].toLowerCase()
  } else {
    return;
  }

  if (pageType == "music") {
    mbz.freemusicarchive_org_importer.release.init();
  }
};

mbz.freemusicarchive_org_importer.init();
