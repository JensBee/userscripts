window.MBZ = {};

MBZ.Release = function(){
	var data = {
		annotation: ''
	};

	var api = {
		addAnnotation: function(content) {
			if (typeof selector === 'string') {
				data.annotation = content;
			}
		},

		dump:function() {
			console.log(data);
		}
	};

	return api;
};
