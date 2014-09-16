// ==UserScript==
// @name MusicBrainz: Fix featured artists.
// @description		Adds a button when editing a recording which attempts to move featuring artists from the recording title to the artist credits.
// @version 1
// @supportURL https://github.com/JensBee/userscripts
// @license MIT
// @namespace http://www.jens-bertram.net/userscripts/fix-featured-artists
// @grant none
//
// @include		*://musicbrainz.org/recording/*/edit
// @include		*://beta.musicbrainz.org/recording/*/edit
// @include		*://test.musicbrainz.org/recording/*/edit
// @include		*://musicbrainz.org/recording/create
// @include		*://beta.musicbrainz.org/recording/create
// @include		*://test.musicbrainz.org/recording/create
// ==/UserScript==
//**************************************************************************//
function injected() {
  var title = $('#id-edit-recording\\.name');
  if (title.val().indexOf("feat.") > -1) {
    title.after('<div class="row" id="jb-fix-featured-row"><label>&nbsp;</label><input type="button" value="Fix featured artists" id="jb-fix-featured"></div>');
  }
  $('#jb-fix-featured').click(function () {
    $('#jb-fix-featured-row').remove();
    
    var titleStr = $('#id-edit-recording\\.name').val();
    var parts = titleStr.match(/^(.*)\s+\(feat\. (.*?)\)(.*)$/);
    var data;

    if (parts) {
      data = [parts[1], parts[2], parts[3]]; // title, feats, additional
    } else {
      parts = titleStr.match(/^(.*)\s+\((.*)\)\s+\(feat\. (.*?)\)$/);
      if (!parts) {
        return;
      }
      data = [parts[1], parts[3], parts[2]]; // title, feats, additional
    }
    data[1] = data[1].split(/[,&]/);
       
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
  });
}
var script = document.createElement('script');
script.appendChild(document.createTextNode('(' + injected + ')();'));
document.body.appendChild(script);
