// ==UserScript==
// @name        MusicBrainz: Fix featured artists.
// @description Adds a button to record editing page to move featured artists from the track title to the artist name. Recognizes strings formatted like '(feat. NAME)'. Multiple featured artists will be automatically split at ',' and '&'. The button is only shown if the string 'feat.' is found in the track title.
// @supportURL  https://github.com/JensBee/userscripts
// @namespace   http://www.jens-bertram.net/userscripts/fix-featured-artists
// @icon        https://wiki.musicbrainz.org/-/images/3/39/MusicBrainz_Logo_Square_Transparent.png
// @license     MIT
// @version     1.4
//
// @grant       none
// @include     *://musicbrainz.org/recording/*/edit
// @include     *://*.musicbrainz.org/recording/*/edit
// @include     *://musicbrainz.org/recording/create
// @include     *://*.musicbrainz.org/recording/create
// @include     *://musicbrainz.org/release/*/edit
// @include     *://*.musicbrainz.org/release/*/edit
// @include     *://musicbrainz.org/release/add
// @include     *://*.musicbrainz.org/release/add
// ==/UserScript==
//**************************************************************************//
var path = window.location.pathname;
var btn = $('<input type="button" title="Fix featured artist names given in track title." id="jb-fix-featured-btn"/>');
if (path.startsWith('/recording/')) {
  // recording page
  var title = $('#id-edit-recording\\.name');
  if (title.length > 0 && title.val().toLowerCase().indexOf('feat.') > - 1) {
    title.after('<div class="row" id="jb-fix-featured-row"><label>&nbsp;</label></div>');
    btn.attr('value', 'Fix featured artists');
    $('#jb-fix-featured-row').append(btn);
    btn.click(function () {
      $('#jb-fix-featured-row').remove();
      var data = getParts($('#id-edit-recording\\.name').val());
      if (data && strNotEmpty(data[0])) {
        $('#id-edit-recording\\.name').val(data[0] + data[2]);
        if (!$('#artist-credit-bubble').is(':visible')) {
          $('#open-ac').click();
        }
        var creds = $('#artist-credit-bubble bdi').size(); // number of existing credits
        for (var i = 0, j = creds; i < data[1].length; i++, j++) {
          $('.add-artist-credit').click();
          var val = data[1][i].trim();
          $('#ac-artist-search-' + j).val(val);
          $('#ac-as-credited-' + j).val(val);
        }
        $('#ac-join-phrase-' + (creds - 1)).val(' feat. ').change();
        $('#ac-artist-search-' + creds).focus();
      }
    });
  }
} else {
  // release page
  btn.attr('value', 'Fix');
  $('#track-ac-bubble>.buttons').filter(':first').append(btn);
  btn.click(function () {
    var data = getParts($('#track-ac-bubble>table>thead>tr>td>span>bdi').text());
    if (data) {
      var inputs = $('#track-ac-bubble input[type=text]');
      for (var i = 0; i < data[1].length; i++) {
        $('#track-ac-bubble .add-item[data-click="addName"]').click();
        var offset = (i + 1) * 3; // field offset for artist
        var val = data[1][i].trim();
        if (i == 0) {
          $('#track-ac-bubble input[type=text]').eq(offset - 1).val(' feat. ').change();
        } else if (i == data[1].length -1) {
          $('#track-ac-bubble input[type=text]').eq(offset - 1).val(' & ').change();
        } else {
          $('#track-ac-bubble input[type=text]').eq(offset - 1).val(', ').change();
        }
        $('#track-ac-bubble input[type=text]').eq(offset).val(val).change();
        $('#track-ac-bubble input[type=text]').eq(offset + 1).val(val).change();
      }
    }
  });
}
function strNotEmpty(str) {
  if (!str) {
    return false;
  }
  return str.trim().length > 0;
}
function getParts(titleStr) {
  var parts = titleStr.match(/^(.*)\s+\(feat\. (.*?)\)(.*)$/i);
  if (!parts) {
    parts = titleStr.match(/^(.*)\s+feat. (.*)$/i);
    if (!parts) {
      return;
    }
    parts[3] = "";
  }
  var data;
  if (parts) {
    data = [
      parts[1],
      parts[2],
      parts[3]
    ]; // title, feats, additional
  } else {
    parts = titleStr.match(/^(.*)\s+\((.*)\)\s+\(feat\. (.*?)\)$/i);
    if (!parts) {
      return;
    }
    data = [
      parts[1],
      parts[3],
      parts[2]
    ]; // title, feats, additional
  }
  data[1] = data[1].split(/[,&]/);
  return data;
}
