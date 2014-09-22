// ==UserScript==
// @name        MusicBrainz function library
// @namespace   http://www.jens-bertram.net/userscripts/mbz-lib
// @description Musicbrainz function library.
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @version     0.1.3beta
// @grant       none
// @supportURL  https://github.com/JensBee/userscripts
// @license     MIT
// ==/UserScript==
window.MBZ = {
	/**
	 * Convert anything to string.
	 * @data object
	 */
	asString: function(data) {
		if (data == null) {
			return '';
		}
		switch (typeof data) {
			case 'string':
				return data.trim();
			case 'object':
				return data.toString().trim();
			case 'function':
				return 'function';
			case 'undefined':
				return '';
			default:
				data = data + '';
				return data.trim();
		}
	},

	/**
	 * Convert HH:MM:SS, MM:SS, SS to seconds.
	 * http://stackoverflow.com/a/9640417
	 * @str string
	 */
	hmsToSeconds: function (str) {
    var p = str.split(':'), s = 0, m = 1;

    while (p.length > 0) {
        s += m * parseInt(p.pop(), 10);
        m *= 60;
    }

		return s;
	},

	/**
	 * Remove a trailing slash from a string
	 * @str string
	 */
	function rmTrSlash(str) {
    if(str.substr(-1) == '/') {
        return str.substr(0, str.length - 1);
    }
    return str;
	}
};

MBZ.Release = function() {
	var formId = 'mbRelease';
	var formTarget = 'https://musicbrainz.org/release/add';
	var form = $('<form method="post" id="' + formId + '" target="_blank" action="' + formTarget + '" acceptCharset="UTF-8"></form>');

	var data = {
		annotation: '', // content
		artists: [], // name
		labels: [], // [name, catalog number]
		mediums: {}, // index -> format
		note: '', // content
		packaging: '', // type
		releases: [], // [year, month, day, region]
		title: '', // release title
		tracks: {}, // medium -> {title -> [number, length]}
		urls: [] // [target, type]
	};

	function addField(name, value, escape) {
		if (escape) {
			form.append($('<input type="hidden" name="' + name + '" value="' + value
				.replace(/&/g, '&amp;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
			+ '"/>'));
		} else {
			form.append($('<input type="hidden" name="' + name + '" value="' + value + '"/>'));
		}
	}

	function buildForm() {
		if (data.annotation != '') {
			addField('annotation', data.annotation, true);
		}

		if (data.artists.length > 0) {
			$.each(data.artists, function(idx, val) {
				addField('artist_credit.names.' + idx + '.name', val);
			});
		}

		if (data.labels.length > 0) {
			$.each(data.labels, function(idx, val) {
				if (val[0] != '') {
					addField('labels.' + idx + '.name', val[0]);
				}
				if (val[1] != '') {
					addField('labels.' + idx + '.catalog_number', val[1]);
				}
			});
		}

		if (data.note != '') {
			addField('edit_note', data.note, true);
		}

		if (data.releases.length > 0) {
			$.each(data.releases, function(idx, val) {
				var prefix = 'events.' + idx + '.';
				addField(prefix + 'date.year', val[0]);
				addField(prefix + 'date.month', val[1]);
				addField(prefix + 'date.day', val[2]);
				if (val[3] != '') {
					addField(prefix + 'country', val[3]);
				}
			});
		}

		$.each(data.mediums, function(idx, val) {
			addField('mediums.'+idx+'.format', val);
		});

		if (data.packaging != '') {
			addField('packaging', data.packaging);
		}

		if (data.title != '') {
			addField('name', data.title);
		}

		$.each(data.tracks, function(medium, tracks) {
			$.each(data.tracks[medium], function(name, val) {
				var prefix = 'mediums.' + medium + '.track.' + val[0] + '.';
				addField(prefix + 'name', name);
				var length = val[1];
				if (!isNaN(length)) {
					addField(prefix + 'length', length);
				}
			});
		});

		if (data.urls.length > 0) {
			$.each(data.urls, function(idx, val) {
				addField('urls.'+idx+'.url', val[0]);
				addField('urls.'+idx+'.link_type', val[1]);
			});
		}
	}

	var api = {
		/**
		 * @name artist name
		 * @return true if value was added
		 */
		addArtist: function(name) {
			name = MBZ.asString(name);
			if (name != '' && data.artists.indexOf(name) == -1) {
				data.artists.push(name);
				return true;
			}
			return false;
		},

		/**
		 * @name label name
		 * @catNo catalog number
		 * @return true if value was added
		 */
		addLabel: function(name, catNo) {
			name = MBZ.asString(name);
			catNo = MBZ.asString(catNo);

			if (name != '' || catNo != '') {
				data.labels.push([name, catNo]);
				return true;
			}
			return false;
		},

		addMediumFormat: function(idx, format) {
			idx = MBZ.asString(idx);
			format = MBZ.asString(format);

			if (idx != '') {
				data.mediums[idx] = format;
			}
		},

		/**
		 * @dateArr [YYYY, MM, DD]
		 * @country code
		 * @return true if value was added
		 */
		addRelease: function(year, month, day, country) {
			year = MBZ.asString(year);
			month = MBZ.asString(month);
			day = MBZ.asString(day);
			country = MBZ.asString(country);

			data.releases.push([year, month, day, country]);
			return true;
		},

		/**
		 * @medium medium number
		 * @name track name
		 * @number track number
		 * @return 1 if value was added, 2 if updated, 0 if no value was changed
		 */
		addTrack: function(medium, name, number, length) {
			name = MBZ.asString(name);
			number = MBZ.asString(number);
			length = MBZ.asString(length);
			medium = MBZ.asString(medium);
			var updated = false;

			if (name == '') {
				return 0;
			} else {
				if (length == 'NaN') {
					length = '';
				}
				if (typeof data.tracks[medium] == 'undefined') {
					data.tracks[medium] = {};
				} else {
					if (typeof data.tracks[medium][name] != 'undefined') {
						// only update unset values
						var currNum = data.tracks[medium][name][0];
						var currLength = data.tracks[medium][name][1];
						if (currNum != '') {
							number = currNum;
						} else {
							updated = true;
						}
						if (currLength != '') {
							length = currLength;
						} else {
							updated = true;
						}
					}
				}
				data.tracks[medium][name] = [number, length];
				if (updated) {
					return 2;
				}
				return 1;
			}
		},

		/**
		 * @url target url
		 * @type musicbrainz url type
		 * @return true if value was added
		 */
		addUrl: function(url, type) {
			url = MBZ.asString(url);
			type = MBZ.asString(type);

			data.urls.push([url, type]);
			return true;
		},

		/**
		 * Dump current data (best viewed in FireBug).
		 */
		dump : function() {
			console.log(data);
		},

		/**
		 * @content annotation content
		 * @return old value
		 */
		setAnnotation: function(content) {
			var old = data.annotation;
			data.annotation = MBZ.asString(content);
			return old;
		},

		/**
		 * @content edeting note content
		 * @return old value
		 */
		setNote: function(content) {
			var old = data.note;
			data.note = MBZ.asString(content);
			return old;
		},

		/**
		 * @content packaging type
		 * @return old value
		 */
		setPackaging: function(type) {
			var old = data.packaging;
			data.packaging = MBZ.asString(type);
			return old;
		},

		/**
		 * @name release title
		 * @return old value
		 */
		setTitle: function(name) {
			var old = data.title;
			data.title = MBZ.asString(name);
			return old;
		},

		/**
		 * Submit data to musicbrainz.
		 */
		submitRelease:function() {
			buildForm();
			$('body').append(form);
			form.submit();
		}
	};

	return api;
};
