// ==UserScript==
// @name        MusicBrainz function library
// @namespace   http://www.jens-bertram.net/userscripts/mbz-lib
// @description Musicbrainz function library.
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// @version     0.2.0beta
// @grant       none
// @supportURL  https://github.com/JensBee/userscripts
// @license     MIT
// ==/UserScript==
window.MBZ = {};

MBZ.baseUrl = 'https://musicbrainz.org/';
MBZ.iconUrl = MBZ.baseUrl + 'favicon.ico',

MBZ.Html = {
	/**
		* Add CSS entry to pages <head/>.
		* @param style definition to add
		*/
	_addGlobalStyle: function(css) {
		if ($('head').length == 0) {
			$('body').append($('<head>'));
		}
    var style = $('head>style');
		if (style.length == 0) {
			style = $('<style>');
			style.attr('type', 'text/css');
			$('head').append(style);
		}
    style.append(css);
	},

	_init: function() {
		this._addGlobalStyle(
			'button.mbzButton {cursor:pointer;' +
				'text-decoration:none; text-shadow:-1px -1px 0 rgba(255,201,97,0.3); font-weight:bold; color:#000;' +
				'padding:5px 5px 5px 25px; border-radius:5px;' +
				'border-top:1px solid #736CAE; border-left:1px solid #736CAE;' +
				'border-bottom:1px solid #FFC961; border-right:1px solid #FFC961;' +
				'background:#FFE3B0 url("' + MBZ.iconUrl + '") no-repeat 5px center;}' +
			'button.mbzButton:hover {' +
				'border:1px solid #454074; background-color:#FFD88C;}' +
			'button.mbzButton:disabled {cursor:default;' +
				'border:1px solid #ccc; background-color:#ccc; color:#5a5a5a;}'
		);
	},

	/**
		* Create a MusicBrainz link.
		*	@params[type] type to link to (e.g. release)
		* @params[id] mbid to link to (optional)
		* @params[more] stuff to add after mbid + '/' (optional)
		* @return plain link text
		*/
	getLink: function (params) {
		return MBZ.baseUrl + params.type + '/' + (params.id ? params.id + '/' : '') + (params.more || '');
	},

	/**
		* Create a MusicBrainz link.
		*	@params[type] type to link to (e.g. release)
		* @params[id] mbid to link to (optional)
		* @params[more] stuff to add after mbid + '/' (optional)
		* @params[title] link title attribute (optional)
		* @params[text] link text (optional)
		* @params[before] stuff to put before link (optional)
		* @params[after] stuff to put after link (optional)
		* @params[icon] true/false: include MusicBrainz icon (optional, default: true)
		* @return link jQuery object
		*/
	getLinkElement: function (params) {
		params.icon = (typeof params.icon !== 'undefined' && params.icon == false ? false : true);
		var retEl = $('<div style="display:inline-block;">');
		if (params.before) {
			retEl.append(params.before);
		}
		var linkEl = $('<a>' + (params.icon ? this.mbzIcon : '') + (params.text || '') + '</a>');
		linkEl.attr('href', this.getLink({
			type: params.type,
			id: params.id,
			more: params.more
		})).attr('target', '_blank');
		if (params.title) {
			linkEl.attr('title', params.title);
		}
		retEl.append(linkEl);
		if (params.after) {
			retEl.append(params.after);
		}
		return retEl;
	},

	getMbzButton: function(caption, title) {
		var btn = $('<button type="button" class="mbzButton">' + caption + '</button>');
		if (title) {
			btn.attr('title', title);
		}
		return btn;
	},

	mbzIcon: '<img src="' + MBZ.iconUrl + '" />'
};
MBZ.Html._init();

MBZ.Util = {
	/**
	 * Convert anything to string.
	 * @data object
	 */
	asString: function (data) {
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
	 * Creates http + https url from a given https? url.
	 * @url http/https url
	 * @return array with given url prefixed with http + https or single url, if not https? protocol
	 */
	expandProtocol: function(url) {
		var urls;
		if (url.toLowerCase().startsWith('http')) {
			var urlPath = url.replace(/^https?:\/\//,'');
			urls = ['http://' + urlPath, 'https://' + urlPath];
		} else {
			urls = [url];
		}
		return urls;
	},

	/**
	 * Creates http + https urls from a given array of https? urls.
	 * @urls array of http/https urls
	 * @return array with given urls prefixed with http + https
	 */
	expandProtocols: function(urls) {
		var newUrls = [];
		var self = this;
		$.each(urls, function(idx, val){
			newUrls = newUrls.concat(self.expandProtocol(val));
		});
		return newUrls;
	},

	/**
	 * Convert HH:MM:SS, MM:SS, SS to seconds.
	 * http://stackoverflow.com/a/9640417
	 * @str string
	 * @return seconds extracted from initial string
	 */
	hmsToSeconds: function (str) {
		str = MBZ.Util.asString(str);
		if (str.indexOf(':') > -1) {
			var p = str.split(':'), s = 0, m = 1;

			while (p.length > 0) {
					s += m * parseInt(p.pop(), 10);
					m *= 60;
			}

			return s;
		} else {
			return str;
		}
	},

	/**
	 * Remove a trailing slash from a string
	 * @str string
	 * @return intial string with trailing slash removed
	 */
	rmTrSlash: function (str) {
		if(str.substr(-1) == '/') {
				return str.substr(0, str.length - 1);
		}
		return str;
	}
};

MBZ.CA = {
	baseUrl: 'https://coverartarchive.org/',
	// no https here (bad_cert notice)
	originBaseUrl: 'https://cors-anywhere.herokuapp.com/coverartarchive.org:443/',

	/**
		* Create a CoverArtArchive link.
		*	@params[type] type to link to (e.g. release)
		* @params[id] mbid to link to (optional)
		* @params[more] stuff to add after mbid (optional)
		*/
	getLink: function (params) {
		return this.originBaseUrl + params.type + '/' + (params.id ? params.id + '/' : '') + (params.more || '');
	},
};

/**
 * MusicBrainz web service v2 interface.
 */
MBZ.WS = {
	_baseUrl: MBZ.baseUrl + 'ws/2/',
	_queue: [],
	_pollFreq: 1100,
	_pollInterval: null,

	/**
	 * Add to request queue.
	 * @params[cb] callback
	 * @params[url] request url
	 * @params[args] callback function parameters object
	 * @params[scope] scope for calling callback function
	 */
	_qAdd: function(params) {
		this._queue.push(params);
		if (!this._pollInterval) {
			if (this._queue.length == 1) {
				this._qPoll();
			}
			this._pollInterval = setInterval(this._qPoll, this._pollFreq);
		}
	},

	/**
	 * Execute queued requests.
	 */
	_qPoll: function() {
		if (MBZ.WS._queue.length > 0) {
			var item = MBZ.WS._queue.pop();
			$.getJSON(item.url, function(data) {
				if (item.args) {
					if (item.scope) {
						item.cb.call(item.scope, data, item.args);
					} else {
						item.cb(data, item.args);
					}
				} else {
					if (item.scope) {
						item.cb.call(item.scope, data);
					} else {
						item.cb(data);
					}
				}
			}).fail(function(jqxhr, textStatus, error) {
				var err = textStatus + ', ' + error;
				console.error("Request (" + item.url + ") failed: " + err);
				if (item.scope) {
					item.cb.call(item.scope);
				} else {
					item.cb();
				}
			});
		} else if (MBZ.WS._queue.length == 0 && MBZ.WS._pollInterval) {
			clearInterval(MBZ.WS._pollInterval);
		}
	},

	/**
		* Lookup a musicbrainz url relation
		* @params[cb] callback function
		* @params[res] url to lookup
		* @params[rel] relation type
		* @params[scope] scope for callback function
		*/
	getUrlRelation: function (params) {
		this._qAdd({
			cb: params.cb,
			url: this._baseUrl + 'url?resource=' + encodeURIComponent(params.res) + '&inc=' + params.rel + '-rels',
			scope: params.scope
		});
	},

	/**
		* Lookup musicbrainz url relations
		* @params[urls] array of urls to lookup
		* @params[rel] relation type
		* @params[cb] callback function for each response
		* @params[cbInc] callback for each item looked up
		* @params[cbDone] callback to call if all items have been looked up
		* @params[scope] scope for callback functions
		*/
	getUrlRelations: function(params) {
		var self = this;
		var count = params.urls.length;
		var current = 0;
		function localCb(data) {
			if (params.scope) {
				params.cb.call(params.scope, data);
			} else {
				params.cb(data);
			}
			if (typeof params.cbInc === 'function') {
				if (params.scope) {
					params.cbInc.call(params.scope);
				} else {
					params.cbInc();
				}
			}
			if (++current == count && typeof params.cbDone === 'function') {
				if (params.scope) {
					params.cbDone.call(params.scope);
				} else {
					params.cbDone();
				}
			}
		}
		$.each(params.urls, function(idx, val) {
			self.getUrlRelation({
				cb: localCb,
				res: val,
				rel: params.rel
			});
		});
	}
};

/**
 * Release related functions.
 */
MBZ.Release = function() {
	var form = $('<form method="post" id="' + MBZ.Release._form.baseName + '-' + (MBZ.Release._form.count++) +
		'" target="_blank" action="' + MBZ.Release._form.target + '" acceptCharset="UTF-8"></form>');

	this.data = {
		annotation: '', // content
		artists: [],
		labels: [],
		mediums: [],
		note: '', // content
		packaging: '', // type
		releases: [],
		title: '', // content
		tracks: [],
		urls: [] // [target, type]
	};

	function addField(name, value) {
		name = MBZ.Util.asString(name);
		value = MBZ.Util.asString(value);
		if (name.length > 0 && value.length > 0) {
			form.append($('<input type="hidden" name="' + name + '" value="' + value
				.replace(/&/g, '&amp;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
			+ '"/>'));
		}
	}

	function buildForm(dataSet) {
		if (dataSet.annotation != '') {
			addField('annotation', dataSet.annotation);
		}

		if (dataSet.artists.length > 0) {
			$.each(dataSet.artists, function(idx, val) {
				var prefix = 'artist_credit.names.' + (val.idx || idx);
				addField(prefix + '.name', val.cred);
				addField(prefix + '.mbid', val.id);
				addField(prefix + '.artist.name', val.name);
				addField(prefix + '.join_phrase', val.join);
			});
		}

		if (dataSet.labels.length > 0) {
			$.each(dataSet.labels, function(idx, val) {
				var prefix = 'labels.' + (val.idx || idx);
				addField(prefix + '.mbid', val.id);
				addField(prefix + '.name', val.name);
				addField(prefix + '.catalog_number', val.catNo);
			});
		}

		if (dataSet.note != '') {
			addField('edit_note', dataSet.note);
		}

		if (dataSet.releases.length > 0) {
			$.each(dataSet.releases, function(idx, val) {
				var prefix = 'events.' + (val.idx || idx);
				addField(prefix + '.date.year', val.y);
				addField(prefix + '.date.month', val.m);
				addField(prefix + '.date.day', val.d);
				addField(prefix + '.country', val.cc);
			});
		}

		$.each(dataSet.mediums, function(idx, val) {
			var prefix = 'mediums.' + (val.idx || idx);
			addField(prefix + '.format', val.fmt);
			addField(prefix + '.name', val.name);
		});

		if (dataSet.packaging != '') {
			addField('packaging', dataSet.packaging);
		}

		if (dataSet.title != '') {
			addField('name', dataSet.title);
		}

		$.each(dataSet.tracks, function(idx, val) {
			var prefix = 'mediums.' + val.med + '.track.' + (val.idx || idx);
			addField(prefix + '.name', val.tit);
			addField(prefix + '.number', val.num);
			addField(prefix + '.recording', val.recId);
			addField(prefix + '.length', val.dur);

			if (val.artists) {
				$.each(val.artists, function(aIdx, aVal) {
					var aPrefix = prefix + '.artist_credit.names.' + (aVal.idx || aIdx);
					addField(aPrefix + '.name', aVal.cred);
					addField(aPrefix + '.mbid', aVal.id);
					addField(aPrefix + '.artist.name', aVal.name);
					addField(aPrefix + '.join_phrase', aVal.join);
				});
			}
		});

		if (dataSet.urls.length > 0) {
			$.each(dataSet.urls, function(idx, val) {
				addField('urls.' + idx + '.url', val[0]);
				addField('urls.' + idx + '.link_type', val[1]);
			});
		}
	}

	/**
		* Submit data to musicbrainz.
		*/
	this.submitRelease = function() {
		buildForm(this.data);
		$('body').append(form);
		form.submit();
	};
};

MBZ.Release._relationCb = function(data) {
	if (!data) {
		return {};
	}
	if (data.relations) {
		var rels = {_res: data.resource};
		$.each(data.relations, function(idx, val) {
			var id = val.release.id;
			var type = val.type;
			if (!rels[id]) {
				rels[id] = [];
			}
			if (rels[id].indexOf(type) == -1) {
				rels[id].push(type);
			}
		});
		return rels;
	}
};

MBZ.Release._form = {
	baseName: 'mbAddReleaseForm',
	count: 0,
	target: MBZ.baseUrl + 'release/add'
};

/**
	* Lookup a musicbrainz url relation for 'release' type.
	* @params[cb] callback function
	* @params[res] url to lookup
	* @params[scope] scope for callback function
	*/
MBZ.Release.getUrlRelation = function(params) {
	function innerCb(cbData) {
		if (params.scope) {
			params.cb.call(params.scope, MBZ.Release._relationCb(cbData));
		} else {
			params.cb(MBZ.Release._relationCb(cbData));
		}
	}
	MBZ.WS.getUrlRelation({
		cb: innerCb,
		res: params.res,
		rel: 'release',
		scope: params.scope
	});
};

/**
	* Lookup musicbrainz url relations for 'release' type.
	* @params[urls] array of urls to lookup
	* @params[cb] callback function for each response
	* @params[cbInc] callback for each item looked up
	* @params[cbDone] callback to call if all items have been looked up
	* @params[scope] scope for callback functions
	*/
MBZ.Release.getUrlRelations = function(params) {
	function innerCb(cbData) {
		if (params.scope) {
			params.cb.call(params.scope, MBZ.Release._relationCb(cbData));
		} else {
			params.cb(MBZ.Release._relationCb(cbData));
		}
	}
	MBZ.WS.getUrlRelations({
		urls: params.urls,
		rel: 'release',
		cb: innerCb,
		cbInc: params.cbInc,
		cbDone: params.cbDone,
		scope: params.scope
	});
};

MBZ.Release.prototype = {
	/**
		* Add an artist entry.
		* @params plain artist name as string or object:
		*		params[cred] artist name as credited
		*		params[id] artists mbid
		*		params[idx] position
		*		params[join] phrase to join with next artist
		*		params[name] artist name
		*/
	addArtist: function(params) {
		if (typeof params === 'string') {
			this.data.artists.push({name: params});
		} else {
			this.data.artists.push(params);
		}
	},

	/**
		* Add a label entry.
		* @params plain label name as string or object.
		* 	params[catNo] catalog number
		*		params[id] mbid
		*		params[idx] position
		*		params[name] label name
		*/
	addLabel: function(params) {
		if (typeof params === 'string') {
			this.data.labels.push({name: params});
		} else {
			this.data.labels.push(params);
		}
	},

	/**
		* Set format of a medium.
		* @params[idx] position
		* @params[fmt] format type name
		*	@params[name] name
		*/
	addMedium: function(params) {
		this.data.mediums.push(params)
	},

	/**
		* Add a release event.
		* @params[y] YYYY
		*	@params[m] MM
		*	@params[d] DD
		* @params[cc] country code
		*	@params[idx] position
		*/
	addRelease: function(params) {
		this.data.releases.push(params);
	},

	/**
		* Add a track.
		* @params[med] medium number
		* @params[tit] track name
		* @params[idx] track number
		* @params[num] track number (free-form)
		* @params[dur] length in MM:SS or milliseconds
		* @params[recId] mbid of existing recording to associate
		* @params[artists] array of objects:
		*		obj[cred] artist name as credited
		*		obj[id] artists mbid
		*		obj[idx] position
		*		obj[join] phrase to join with next artist
		*		obj[name] artist name
		*/
	addTrack: function(params) {
		this.data.tracks.push(params);
	},

	/**
		* @url target url
		* @type musicbrainz url type
		* @return true if value was added
		*/
	addUrl: function(url, type) {
		url = MBZ.Util.asString(url);
		type = MBZ.Util.asString(type);

		this.data.urls.push([url, type]);
		return true;
	},

	/**
		* Dump current data (best viewed in FireBug).
		*/
	dump: function() {
		console.log(this.data);
	},

	/**
		* @content annotation content
		* @return old value
		*/
	setAnnotation: function(content) {
		var old = this.data.annotation;
		this.data.annotation = MBZ.Util.asString(content);
		return old;
	},

	/**
		* @content edeting note content
		* @return old value
		*/
	setNote: function(content) {
		var old = this.data.note;
		this.data.note = MBZ.Util.asString(content);
		return old;
	},

	/**
		* @content packaging type
		* @return old value
		*/
	setPackaging: function(type) {
		var old = this.data.packaging;
		this.data.packaging = MBZ.Util.asString(type);
		return old;
	},

	/**
		* @name release title
		* @return old value
		*/
	setTitle: function(name) {
		var old = this.data.title;
		this.data.title = MBZ.Util.asString(name);
		return old;
	},
};
