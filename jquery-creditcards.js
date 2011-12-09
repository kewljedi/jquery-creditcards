/*
 * 'Highly configurable' mutable plugin boilerplate
 * Author: @markdalgleish
 * Further changes, comments: @addyosmani
 * Licensed under the MIT license
 */

// Note that with this pattern, as per Alex Sexton's, the plugin logic
// hasn't been nested in a jQuery plugin. Instead, we just use
// jQuery for its instantiation.

;(function( $, window, document, undefined ){	
	function mod10(cardnumber){
	    var returnVal = false;
		var checksum = 0;                                  // running checksum total
		var mychar = "";                                   // next char to process
		var j = 1;                                         // takes value of 1 or 2
	    var cardNo = cardnumber.toString();
		
		// Process each digit one by one starting at the right
		var calc;
		for (i = cardNo.length - 1; i >= 0; i--) {
		
		  // Extract the next digit and multiply by 1 or 2 on alternative digits.
		  calc = Number(cardNo.charAt(i)) * j;
		
		  // If the result is in two digits add 1 to the checksum total
		  if (calc > 9) {
			checksum = checksum + 1;
			calc = calc - 10;
		  }
			
		  // Add the units element to the checksum total
		  checksum = checksum + calc;
			
		  // Switch the value of j
		  if ( j == 1 ) {
			j = 2
		  } else {
			j = 1
		  };
		} 
		  
		// All done - if checksum is divisible by 10, it is a valid modulus 10.
		// If not, report an error.
		if ( checksum % 10 == 0 )  {
			returnVal = true;		 
		}
		
		return returnVal;
	}

  // our plugin constructor
  var CreditCardValidation = function( elem, options ){
      this.elem = elem;
      this.$elem = $(elem);
      this.options = options;
	  
      // This next line takes advantage of HTML5 data attributes
      // to support customization of the plugin on a per-element
      // basis. For example,
      // <div class=item' data-plugin-options='{"message":"Goodbye World!"}'></div>
      this.metadata = this.$elem.data( 'creditcard-options' );
    };

  // the plugin prototype
  CreditCardValidation.prototype = {

    init: function() {
      this.config = $.extend({}, this.defaults, this.options, this.metadata);
	  
	  this.$elem.bind( 'keyup.creditcardvalidation', $.proxy(this.keyup,this) );
	  this.$elem.bind( 'focusout.creditcardvalidation',$.proxy(this.focusout,this));
	  this.cards = this.config.cards; 
	  this.IINLength = 6;	 

	  $('head').append('<link rel="stylesheet" href="creditcardsprite.css" type="text/css" />');

      return this;
    },
	destroy: function() {
		this.$elem.unbind('.creditcardvalidation');		
	},
	focusout: function(eventobj) {
		this.validate();
	},
	keyup:function(eventobj){
		CCN = this.$elem.val();
		if(eventobj.keyCode == 46 || eventobj.keyCode == 8 || CCN.toString().length == 0 )
		{
			this.cards = this.config.cards;		
			this.card = null;				
			this.mapIIN(CCN);
		}
		
		if(this.card == null) //&& this.cards.length != 1)
		{			
			this.mapIIN(CCN);
		}
		
		this.validate();
	},
	mapIIN: function(CCN) {
		
		this.cards = $.map(this.cards, 
				$.proxy(
					function(value)	{
						var retValue = null;
						
						if(this.matchIIN(value,CCN))
						{
							retValue = value;
						}
						
						return retValue;
					},
					this
				)
			);
			
		if(this.cards.length == 1 && this.card != null)
		{
			//we now know the type of card.
			if($.isFunction(this.config.OnCardTypeFound))
			{
				this.config.OnCardTypeFound( this.cards[0] );
			}
		}
		
		if(this.cards.length <= 0)
		{
			//this.card = null;
			if($.isFunction(this.config.OnCardTypeError))
			{
				this.config.OnCardTypeError(this.card);
			}
		}
		
	},
    validate: function() {
		//the first step is to get the value from the control that we are attached to.
		var inputcc = this.$elem.val();
		var isValid = false;
		
		if( inputcc.length >= 6 )
		{		
			this.IIN = inputcc.substring(0,5);
		
			//since none of the credit cards end up not being numbers lets do that first...
			this.CCN = new Number(inputcc);
			// this.card = null;
			
			jQuery.each(this.defaults.cards,$.proxy( function( index, value)
			{
				if(this.matchIIN(value, this.IIN))
				{
					if(this.matchNumberSize(value,this.CCN)) {
						if(value.checksum(this.CCN)) {
							isValid = true;
							this.card = value;
							return false;
						}
					}
				}
				
				// this.card = null;
				
			},this));
		} 
		
		if(isValid)
		{
			if($.isFunction(this.config.OnValidationSuccess)){
				this.config.OnValidationSuccess(this.card);
			}		
		} else {
			if($.isFunction(this.config.OnValidationFailure)){
				this.config.OnValidationFailure(this.card);
			}
		}
    },
	matchNumberSize: function(card, cardnumber){
		var returnVal = false;
		jQuery.each(card.numbersizes, function(index, value)
		{
			if(value == cardnumber.toString().length)
			{
				returnVal = true;
				return false;
			}
		});
		return returnVal;
	},
	matchIIN: function(card, IIN){
		var returnVal = false;		
		//Find out if we have a IIN that exists for this card.
		jQuery.each(card.iin, $.proxy(function(index, value)
		{
			//lets just start by seeing if what they have typed so far is a match.
			var tempIIN = IIN;
			var tempValue = value;
			
			// Get the lengths beforehand for easier debugging
			var val1 = IIN.toString().length;
			var val2 = value.toString().length;
			
			if(val1 > val2)
			{
				tempIIN = new Number(IIN.toString().substring(0,val2));
			} else {
				tempValue = new Number(value.toString().substring(0,val1));				
			}
			
			if(tempIIN.valueOf() == tempValue.valueOf())
			{
				returnVal = true;
				//since we know they match at this level we need to keep it
				if(IIN.toString().length >= value.toString().length)
				{
					//we now know this card is an exact IIN match.
					this.card = card;
					return false;
				}				
			}
		},this));
		
		return returnVal;
	},
	defaults: {
		OnCardTypeFound: function(card) {
			$("#CC-RES").attr("class", "CC " + card.imageclass);
		},
		OnCardTypeError: function(card) { 
		
			$("#CC-RES").attr("class", card.imageclass + "-NOTSELECTED");
			//this.card = null;
		},
		OnValidationSuccess: function(card){ 
			
			$("#CC-RES").attr("class", "CC " + card.imageclass + "-SELECTED");
		},
		OnValidationFailure: function(card){ 
			
			$("#CC-RES").attr("class", "CC " + card.imageclass + "-NOTSELECTED");	
		},
		cards:[
			{
				name:'Master Card',
				numbersizes:[16],
				checksum: mod10,
				iin: [51,52,53,54,55],
				imageclass:'MASTER',
				csc:'CVC2'
			},
			{
				name:'Visa',
				numbersizes:[ 13,16],
				checksum: mod10,
				iin: [4],
				imageclass:'VISA',
				csc: 'CVV2'
			},
			{
				name:'American Express',
				numbersizes:[15],
				checksum: mod10,
				imageclass:'ae',
				iin:[34,37],
				csc:'CID'
			},
			{
				name:'Discover',
				numbersizes:[16],
				checksum: mod10,
				imageclass:'DISCOVER',
				iin:[6011,622,64,65],
				csc:'CID'
			}
		],
		cscs:[
			{
				name: "Card Verification Value",
				id:'CVV2',
				numbersizes:[3],
				description:'The three-digit card security code is not embossed like the card number, and is always the final group of numbers printed on the back signature panel of the card. New North American MasterCard and Visa cards feature the code in a separate panel to the right of the signature strip.',
				image:''
			},
			{
				name: 'Card Verification Value',
				id:'CVV2',
				numbersizes:[3],
				description:'The three-digit card security code is not embossed like the card number, and is always the final group of numbers printed on the back signature panel of the card. New North American MasterCard and Visa cards feature the code in a separate panel to the right of the signature strip.',
				image:''
			},
			{
				name: 'Card Identification Number',
				id:'CID',
				numbersizes:[3],
				description:'The three-digit card security code is not embossed like the card number, and is always the final group of numbers printed on the back signature panel of the card. New North American MasterCard and Visa cards feature the code in a separate panel to the right of the signature strip.',
				image:''
			},
			{
				name: 'Unique Card Code',
				id: 'UCC',
				numbersizes:[4],
				description:'American Express cards have a four-digit code printed on the front side of the card above the number. It is printed flat, not embossed like the card number.',
				image:''
			}
		]
    }
  }

  CreditCardValidation.defaults = CreditCardValidation.prototype.defaults;

  $.fn.creditcardvalidation = function(options) {
    return this.each(function() {
      new CreditCardValidation(this, options).init();
    });
  };

  //optional: window.Plugin = Plugin;

})( jQuery, window , document );
