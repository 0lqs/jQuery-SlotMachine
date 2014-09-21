/*
  * jQuery Slot Machine v1.0.0
  * https://github.com/josex2r/jQuery-SlotMachine
  *
  * Copyright 2014 Jose Luis Represa
  * Released under the MIT license
*/
;(function($, window, document, undefined){
	
	var pluginName = "slotMachine",
        defaults = {
			active	: 0, //Active element [int]
			delay	: 200, //Animation time [int]
			auto	: false, //Repeat delay [false||int]
			randomize : null, //Randomize function, must return an integer with the selected position
			stopHidden : true //Stops animations if the element isn´t on the screen
		};
	
	var FX_FAST = 'slotMachineBlurFast',
		FX_NORMAL = 'slotMachineBlurMedium',
		FX_SLOW = 'slotMachineBlurSlow',
		FX_GRADIENT = 'slotMachineGradient',
		FX_STOP = FX_GRADIENT;
			
	//Set required styles, filters and masks
	$(document).ready(function(){
		
		//Fast blur
		if( $('filter#slotMachineBlurSVG').length<=0 ){
			$('body').append('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="0" height="0">'+
								'<filter id="slotMachineBlurFilterFast">'+
									'<feGaussianBlur stdDeviation="5" />'+
								'</filter>'+
							'</svg>');
		}
		
		//Medium blur
		if( $('filter#slotMachineBlurSVG').length<=0 ){
			$('body').append('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="0" height="0">'+
								'<filter id="slotMachineBlurFilterMedium">'+
									'<feGaussianBlur stdDeviation="3" />'+
								'</filter>'+
							'</svg>');
		}
		
		//Slow blur
		if( $('filter#slotMachineBlurSVG').length<=0 ){
			$('body').append('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="0" height="0">'+
								'<filter id="slotMachineBlurFilterSlow">'+
									'<feGaussianBlur stdDeviation="1" />'+
								'</filter>'+
							'</svg>');
		}
		
		//Fade mask
		if( $('mask#slotMachineFadeSVG').length<=0 ){
			$('body').append('<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="0" height="0">'+
								'<mask id="slotMachineFadeMask" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">'+
									'<linearGradient id="slotMachineFadeGradient" gradientUnits="objectBoundingBox" x="0" y="0">'+
										'<stop stop-color="white" stop-opacity="0" offset="0"></stop>'+
										'<stop stop-color="white" stop-opacity="1" offset="0.25"></stop>'+
										'<stop stop-color="white" stop-opacity="1" offset="0.75"></stop>'+
										'<stop stop-color="white" stop-opacity="0" offset="1"></stop>'+
									'</linearGradient>'+
									'<rect x="0" y="-1" width="1" height="1" transform="rotate(90)" fill="url(#slotMachineFadeGradient)"></rect>'+
								'</mask>'+
							'</svg>');
		}
		
		//CSS classes
		$('body').append('<style>' +
								'.' + FX_FAST + '{-webkit-filter: blur(5px);-moz-filter: blur(5px);-o-filter: blur(5px);-ms-filter: blur(5px);filter: blur(5px);filter: url(#slotMachineBlurFilterFast);filter:progid:DXImageTransform.Microsoft.Blur(PixelRadius="5")}' +
								'.' + FX_NORMAL + '{-webkit-filter: blur(3px);-moz-filter: blur(3px);-o-filter: blur(3px);-ms-filter: blur(3px);filter: blur(3px);filter: url(#slotMachineBlurFilterMedium);filter:progid:DXImageTransform.Microsoft.Blur(PixelRadius="3")}' +
								'.' + FX_SLOW + '{-webkit-filter: blur(1px);-moz-filter: blur(1px);-o-filter: blur(1px);-ms-filter: blur(1px);filter: blur(1px);filter: url(#slotMachineBlurFilterSlow);filter:progid:DXImageTransform.Microsoft.Blur(PixelRadius="1")}' +
								'.' + FX_GRADIENT + '{' +
									'-webkit-mask-image: -webkit-gradient(linear, left top, left bottom, color-stop(0%, rgba(0,0,0,0)), color-stop(25%, rgba(0,0,0,1)), color-stop(75%, rgba(0,0,0,1)), color-stop(100%, rgba(0,0,0,0)) );' +
									'mask: url(#slotMachineFadeMask);' +
								'}'+
							'</style>');
		
	});
	
	//Required easing functions
	if( typeof $.easing.easeOutBounce!=="function" ){
		//From jQuery easing, extend jQuery animations functions
		$.extend( $.easing, {
			easeOutBounce: function (x, t, b, c, d) {
				if ((t/=d) < (1/2.75)) {
					return c*(7.5625*t*t) + b;
				} else if (t < (2/2.75)) {
					return c*(7.5625*(t-=(1.5/2.75))*t + 0.75) + b;
				} else if (t < (2.5/2.75)) {
					return c*(7.5625*(t-=(2.25/2.75))*t + 0.9375) + b;
				} else {
					return c*(7.5625*(t-=(2.625/2.75))*t + 0.984375) + b;
				}
			},
		});
	}
	
	/**
	  * @desc PUBLIC - Makes Slot Machine animation effect
	  * @param object settings - Plugin configuration params
	  * @return jQuery node - Returns jQuery selector with some new functions (shuffle, stop, next, auto, active)
	*/
	function SlotMachine(element, options){
		this.element = element;
		this.settings = $.extend( {}, defaults, options);
		this._defaults = defaults;
		this._name = pluginName;
		
		var	self = this,
			$slot = $(element), //jQuery selector
			$tiles = $slot.children(), //Slot Machine elements
			$container, //Container to wrap $tiles
			_minTop, //Min marginTop offset
			_maxTop, //Max marginTop offset
			_$fakeFirstTile, //First element (the last of the html container)
			_$fakeLastTile, //Last element (the first of the html container)
			_timer = null, //Timeout recursive function to handle auto (settings.auto)
			_forceStop = false, //Force execution stop for some functions
			_oncompleteShuffling = null, //Callback function
			_isRunning = false, //Machine is running?
			_active = { //Current active element
				index	: this.settings.active,
				el		: $tiles.get( this.settings.active )
			};
		
		/**
		  * @desc PRIVATE - Get element offset top
		  * @param int index - Element position
		  * @return int - Negative offset in px
		*/
		function _getOffset( index ){
			var offset = 0;
			for(var i=0; i<index; i++){
				offset += $( $tiles.get(i) ).outerHeight();
			}
			return -offset + _minTop;
		}
		
		/**
		  * @desc PRIVATE - Get current element index
		  * @return int - $tiles element index
		*/
		function _getIndexFromOffset(){
			return Math.abs( Math.round( parseInt( $container.css('margin-top').replace(/px/, ''), 10) / $tiles.first().height() ) ) -1;
		}
		
		/**
		  * @desc PRIVATE - Get random element different than last shown
		  * @param boolean cantBeTheCurrent - true||undefined if cant be choosen the current element, prevents repeat
		  * @return object - Element index and HTML node
		*/
		function _getRandom(cantBeTheCurrent){
			var rnd,
				removePrevious = cantBeTheCurrent || false;
			do{
				rnd = Math.floor( Math.random() * $tiles.length );
			}while( (removePrevious && rnd===_active.index) && rnd>=0 );
			
			//Choose element
			return {
				index : rnd,
				el : $tiles.get( rnd )
			};
		}
		
		/**
		  * @desc PUBLIC - Changes randomize function
		  * @param function|int - Set new randomize function
		*/
		function _setRandomize(rnd){
			if( typeof rnd==='number' ){
				var _fn = function(){
					return rnd;
				};
				self.settings.randomize = _fn;
			}else{
				self.settings.randomize = rnd;
			}
		}
		
		/**
		  * @desc PRIVATE - Get random element based on the custom randomize function
		  * @return object - Element index and HTML node
		*/ 
		function _getCustom(){
			var choosen;
			if( self.settings.randomize!==null && typeof self.settings.randomize==='function' ){
				var index = self.settings.randomize(_active.index);
				if( index<0 || index>=$tiles.length ){
					index = 0;
				}
				choosen = {
					index : index,
					el : $tiles.get( index )
				};
			}else{
				choosen = _getRandom();
			}
			return choosen;
		}
		
		/**
		  * @desc PRIVATE - Get the previous element
		  * @return int - Element index and HTML node
		*/ 
		function _getPrev(){
			var prevIndex = _active.index-1<0 ? $tiles.length-1 : _active.index-1;
			
			return {
				index	: prevIndex,
				el		: $tiles.get(prevIndex)
			};
		}
		
		/**
		  * @desc PRIVATE - Get the next element
		  * @return int - Element index and HTML node
		*/ 
		function _getNext(){
			var nextIndex = _active.index+1<$tiles.length ? _active.index+1 : 0;
			
			return {
				index	: nextIndex,
				el		: $tiles.get(nextIndex)
			};
		}
		
		/**
		  * @desc PRIVATE - Set CSS classes to make speed effect
		  * @param string FX_SPEED - Element speed [FX_FAST_BLUR||FX_NORMAL_BLUR||FX_SLOW_BLUR||FX_STOP]
		  * @param string||boolean fade - Set fade gradient effect
		*/
		function _setAnimationFX(FX_SPEED, fade){
			$tiles.removeClass(FX_FAST).removeClass(FX_NORMAL).removeClass(FX_SLOW).addClass(FX_SPEED);
			
			if(fade !== true || FX_SPEED === FX_STOP){
				$slot.add($tiles).removeClass(FX_GRADIENT);
			}else{
				$slot.add($tiles).addClass(FX_GRADIENT);
			}
		}
		
		/**
		  * @desc PRIVATE - Reset active element position
		*/
		function _resetPosition(){
			$container.css("margin-top", _getOffset(_active.index));
		}
		
		/**
		  * @desc PRIVATE - Starts shuffling the elements
		  * @param int repeations - Number of shuffles (undefined to make infinite animation
		*/
		function _shuffle( repeations ){
			
			if(!_isVisible()){
				
				_setAnimationFX(FX_STOP);
				
				_resetPosition();
				
				setTimeout(function(){
					_stop();
				}, self.settings.delay);
				
				return;
			}
			
			_isRunning = true;
			
			var delay = self.settings.delay;
			
			//Infinite animation
			if(typeof repeations !== 'number'){
				
				//Set animation effects
				_setAnimationFX(FX_FAST, true);
				
				delay /= 2;
				
				//Perform animation
				$container.animate({
					marginTop : _maxTop
				}, delay, 'linear', function(){
					//Oncomplete animation
					if(_forceStop === false){
						//Reset top position
						$container.css('margin-top', 0);
						//Repeat animation
						_shuffle();
					}
				});
			
			//Stop animation after {repeations} repeats
			}else if(typeof repeations === 'number' && repeations > 0){
				
				//Change delay and speed
				switch( repeations ){
					case 1:
						_setAnimationFX(FX_SLOW, true);
						break;
					case 2:
					case 3:
					_setAnimationFX(FX_NORMAL, true);
						delay /= 1.5;
						break;
					default:
						_setAnimationFX(FX_FAST, true);
						delay /= 2;
				}
					
				//Perform animation
				$container.animate({
					marginTop : _maxTop
				}, delay, 'linear', function(){
					if( _forceStop===false ){
						//Reset top position
						$container.css('margin-top', 0);
						//Repeat animation on complete
						_shuffle( repeations-1 );
					}
				});
				
			}else{
				_stop();
			}
			
		}
		
		/**
		  * @desc PRIVATE - Stop shuffling the elements
		  * @param int repeations - Number of repeations to stop (true to stop NOW)
		*/
		function _stop( getElementFn ){
			//Stop animation NOW!!!!!!!
			$container.clearQueue().stop();
			
			_setAnimationFX(FX_SLOW, true);
			
			_isRunning = true;
			
			if(!_isVisible()){
				if(typeof _oncompleteShuffling === 'function'){
					_oncompleteShuffling(false, false);
				}
				_setAnimationFX(FX_STOP, false);
				_resetPosition();
				_isRunning = false;
				return;
			}
			
			//Get random or custom element
			var rnd = _getRandom();
			if(typeof getElementFn === 'function'){
				
				rnd = getElementFn();
				
			}else{
				if(self.settings.randomize !== null && typeof self.settings.randomize === 'function'){
					rnd = _getCustom();
				}else if( self.settings.auto ){
					rnd = _getNext();
				}
			}
			
			//Set current active element
			_active.index = _getIndexFromOffset();
			_active.el = $tiles.get(_active.index);
			
			//Get random element offset and delay
			var offset = _getOffset(rnd.index),
				delay = self.settings.delay * 3; //self.settings.delay * (rnd.index/5 + 1);
			
			//Check direction to prevent jumping
			if( rnd.index>_active.index ){
				//We are moving to the prev (first to last)
				if(_active.index === 0 && rnd.index === $tiles.length-1){
					$container.css('margin-top', _getOffset($tiles.length) );
				}
			}else{
				//We are moving to the next (last to first)
				if( _active.index===$tiles.length-1 && rnd.index===0 ){
					$container.css('margin-top', 0);
				}
			}
			
			//Update last choosen element index
			_active = rnd;
			
			//Perform animation
			$container.animate({
				marginTop : offset
			}, delay, 'easeOutBounce', function (){
				
				_setAnimationFX(FX_STOP);
			
				_isRunning = false;
				
				if(typeof _oncompleteShuffling === 'function'){
							
					_oncompleteShuffling($slot, _active);
					
					_oncompleteShuffling = null;
					
				}
				
			});
			
			//Change blur
			setTimeout(function(){
				_setAnimationFX('false', false);
			}, delay/2);
			
		}
		
		/**
		  * @desc PRIVATE - Checks if the machine is on the screen
		  * @return int - Returns true if machine is on the screen
		*/
		function _isVisible(){
			if(self.settings.stopHidden === false){
				return false;
			}
			//Stop animation if element is [above||below] screen, best for performance
			var above = $slot.offset().top > $(window).scrollTop() + $(window).height(),
				below = $(window).scrollTop() > $slot.height() + $slot.offset().top;
			
			return !above && !below;
		}
		
		/**
		  * @desc PRIVATE - Start auto shufflings, animation stops each 3 repeations. Then restart animation recursively
		*/
		function _auto(){
			
			if(_forceStop === false){
				
				_timer = setTimeout(function(){
					
					_oncompleteShuffling = _auto;
					_forceStop = false;
					_shuffle(5);
					
				}, self.settings.auto);
				
			}
			
		}
		
		$slot.css("overflow", "hidden");
		
		//Validate active index
		if(this.settings.active < 0 || this.settings.active >= $tiles.length ){
			this.settings.active = 0;
			_active.index = 0;
			_active.el = $tiles.get(0);
		}
		
		//Wrap elements inside $container
		$tiles.wrapAll("<div class='slotMachineContainer' />");
		$container = $slot.find(".slotMachineContainer");
		
		//Set max top offset
		_maxTop = - $container.height();
		
		//Add the last element behind the first to prevent the jump effect
		_$fakeFirstTile = $tiles.last().clone();
		_$fakeLastTile = $tiles.first().clone();
		
		$container.prepend( _$fakeFirstTile );
		$container.append( _$fakeLastTile );
		
		//Set min top offset
		_minTop = -_$fakeFirstTile.outerHeight();
		
		//Show active element
		$container.css('margin-top', _getOffset(self.settings.active));
		
		//Start auto animation
		if(self.settings.auto !== false){
			if(self.settings.auto === true){
				_shuffle();
			}else{
				_auto();
			}
		}
		
		/*
		 * Return public functions and attrs
		 */
		return {
			/**
			  * @desc PUBLIC - Start auto shufflings, animation stops each 3 repeations. Then restart animation recursively
			*/
			auto: _auto,
			
			/**
			  * @desc PUBLIC - Starts shuffling the elements
			  * @param int repeations - Number of shuffles (undefined to make infinite animation
			*/
			shuffle : function( repeations, oncomplete ){
				_forceStop = false;
				_oncompleteShuffling = oncomplete;
				if( typeof repeations==='number' ){
					_shuffle(repeations);
				}else{
					_shuffle( repeations!==undefined ? 5 : undefined );
				}
			},
			
			/**
			  * @desc PUBLIC - Stop shuffling the elements
			  * @param int repeations - Number of repeations before stop
			*/
			stop : function( repeations ){
				
				if( self.settings.auto!==false && _timer!==null ){
					clearTimeout(_timer);
				}
				
				if( typeof repeations==='number' && repeations>0 ){
					$container.clearQueue().stop(true, false);
					_forceStop = false;
					_shuffle(repeations);
				}else{
					_forceStop = true;
					_stop();
				}
			},
			
			/**
			  * @desc PUBLIC - SELECT previous element relative to the current active element
			*/
			prev : function(){
				_stop(_getPrev);
			},
			
			/**
			  * @desc PUBLIC - SELECT next element relative to the current active element
			*/
			next : function(){
				_stop(_getNext);
			},
			
			/**
			  * @desc PUBLIC - Get selected element
			  * @return object - Element index and HTML node
			*/
			active : function(){
				return _active;
			},
			
			/**
			  * @desc PUBLIC - Check if the machine is doing stuff
			  * @return boolean - Machine is shuffling
			*/
			isRunning : function(){
				return _isRunning;
			},
			
			/**
			  * @desc PUBLIC - Changes randomize function
			  * @param function|int - Set new randomize function
			*/
			setRandomize : _setRandomize
		};
    }
    
    /*
     * Create new plugin instance if needed and return it
     */
	function _getInstance(element, options){
		var machine;
		if ( !$.data(element, 'plugin_' + pluginName) ){
			machine = new SlotMachine(element, options);
			$.data(element, 'plugin_' + pluginName, machine);
		}else{
			machine = $.data(element, 'plugin_' + pluginName);
		}
		return machine;
	}
	
	/*
	 * Chainable instance
	 */
	$.fn[pluginName] = function(options){
		if( this.length===1 ){
			return _getInstance(this, options);
		}else{
			return this.each(function(){
				if( !$.data(this, 'plugin_' + pluginName) ){
					_getInstance(this, options);
				}
			});
		}
	};

})( jQuery, window, document );