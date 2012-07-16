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
	
		// This next line takes advantage of HTML5 data attributes
		// to support customization of the plugin on a per-element
		// basis. For example,
		// <div class=item' data-plugin-options='{"message":"Goodbye World!"}'></div>
		this.metadata = this.$elem.data( 'creditcard-options' );

		this.options = $.extend({ callback: function() {}}, arguments[0] || {}, options);
	
		this.config = $.extend({}, this.defaults, this.options, this.metadata);
		
		// This section builds the control
		
		// TODO: Figure out some logic if someone names their custom div's the same names as the default ones
		
		// Set up inputbox
		if (this.config.inputTextBoxID == this.defaults.inputTextBoxID) {
			var newTextBoxDiv = $(document.createElement('div')).attr("id", 'ccnTextBoxDiv');
			newTextBoxDiv.appendTo(elem);
			newTextBoxDiv.after().html('<input type="text" name="TextBoxDiv" id="ccnTextBox" value="" >');
			this.ccnTextBox = this.$elem.find('#ccnTextBox');
		} else {
			this.ccnTextBox = this.$elem.find('#' + this.config.inputTextBoxID);
		}
		
		// Set up the CCV box
		if (this.config.ccvTextBoxID == this.defaults.ccvTextBoxID) {
			var newccvTextBoxID = $(document.createElement('div')).attr("id", 'ccvTextBoxDiv');
			newccvTextBoxID.appendTo(elem);
			newccvTextBoxID.after().html('<input type="text" name="CCVtextbox" id="ccvTextBox" value="" >');
			this.ccvTextBox = this.$elem.find('#ccvTextBox');		
		} else {
			this.ccvTextBox = this.$elem.find('#' + this.config.ccvTextBoxID);
		}
		
		// Set up image 
		if (this.config.imageDivID == this.defaults.imageDivID) {
			this.$imageDivID = $(document.createElement('div')).attr("id", this.config.imageDivID);
			this.$imageDivID.appendTo(elem);
		} else {
			this.$imageDivID = $(this.$elem).find('#' + this.config.imageDivID);
		}
	 
	 
    };

  // the plugin prototype
  CreditCardValidation.prototype = {
    init: function() {
		this.$elem.bind( 'keyup.creditcardvalidation', $.proxy(this.keyup,this) );
		this.$elem.bind( 'focusout.creditcardvalidation',$.proxy(this.focusout,this));
		this.cards = this.config.cards; 
		this.IINLength = 6;	 
		this.isCCNvalid = false;
		this.isCCVvalid = false;

		var path = this.scriptPath("jquery-creditcards.js");
		
		$('head').append('<link rel="stylesheet" href="' + path + 'creditcardsprite.css" type="text/css" />');

		return this;
    },
	destroy: function() {
		this.$elem.unbind('.creditcardvalidation');		
	},
	focusout: function(eventobj) {		
		this.validate();			
	},
	keyup:function(eventobj){
		
		switch(eventobj.target.id) {
				case this.config.imageDivID:
					// This is pointless
					break;
				
				case this.config.ccvTextBoxID:
					// Process the 3 digit code
					var CCV = this.ccvTextBox.val();
					
					if (this.card == null || this.isCCNvalid == false) {
						this.ccvTextBox.val('');
										
					} else {
						// prevent typing
						var maxNumbers = 0;
						
						for (var i = 0; i < this.config.cscs.length; i++) {
							var csc = this.config.cscs[i];
							if (csc.id == this.card.csc) {
								// We know what we are looking for now
								maxNumbers = this.getMaxNumberSize(csc.numbersizes);
								break;
							}
						}
						
						if (CCV.toString().length >= maxNumbers && maxNumbers > 0) {
							this.ccvTextBox.val(CCV.substring(0, maxNumbers));
						}
					}
					
					break;
					
				case this.config.inputTextBoxID:
					// Process the event on the input div
					var CCN = this.ccnTextBox.val();
			
					if(eventobj.keyCode == 46 || eventobj.keyCode == 8 || CCN.toString().length == 0 )
					{					
						this.clearSubs();
					}
					
					if(this.card == null) 
					{			
						this.mapIIN(CCN);
					} else {
						// prevent typing more numbers.
						var maxNumbers = 0;
						maxNumbers = this.getMaxNumberSize(this.card.numbersizes);
						
						if (CCN.toString().length > maxNumbers) {
							this.ccnTextBox.val(CCN.substring(0, maxNumbers));
						}
					}
					
					if(this.card != null)
					{
						this.validate();
					}
					break;
					
				default:
					// Nothing right now
		}
		
		// Clear out the ccvTextBox if card not valid
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
		    var card = this.card;
		
			//we now know the type of card.
			if(card.accept)
			{						
				this.setImage("FOUND");
				this.setCardLength(this.card);
				
				if($.isFunction(this.config.OnCardTypeFound))
				{
					this.config.OnCardTypeFound( this, card );
				}
			} else{		
			
				this.clearSubs();
				
				if($.isFunction(this.config.OnDisabledCard))
				{
					this.config.OnDisabledCard( this, card );					
				}
			}
		} 
		
		if(this.cards.length <= 0)
		{
			//this.card = null;
			this.clearSubs();
			if($.isFunction(this.config.OnCardTypeError))
			{
				this.config.OnCardTypeError( this );
			}
		}
		
	},
	setCardLength: function(card) {
		//lets get the credit card number field's max length set.
		
		var maxlength = 0;
		maxlength = this.getMaxNumberSize(card.numbersizes);
		if(maxlength != 0)
		{
			this.ccnTextBox.attr("maxlength", maxlength);		
		}
		
		//and now lets take care of the CVV field's max length		
		jQuery.each(this.defaults.cscs,$.proxy( function(index, value)
		{
			if(value.id == card.csc)
			{
				maxlength = this.getMaxNumberSize(value.numbersizes);
				return false;
			}
		},this));
		
		if(maxlength != 0 )
		{
			this.ccvTextBox.attr("maxlength", maxlength);		
		}
	},
	getMaxNumberSize: function( sizes )
	{
		var maxlength = 0;
		jQuery.each(sizes, function(index, value)
		{
			if(value > maxlength)
			{
				maxlength = value;
			}
		});		
		return maxlength;
	},
	clearSubs: function() {
		this.card = null;
		this.cards = this.config.cards
		
		this.setImage("none");
		
		this.isCCNvalid = false;
		this.isCCVvalid = false;
		
		this.ccvTextBox.val('');
		this.ccnTextBox.removeAttr("maxlength");
	},
    validate: function() {
		//the first step is to get the value from the control that we are attached to.
		var inputcc = this.ccnTextBox.val();
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
					if( this.matchNumberSize( value, this.CCN ) ) {
						if( value.checksum( this.CCN ) ) {
							isValid = true;
							this.card = value;
							return false;
						}
					}
				}
				
				// this.card = null;
				
			},this));
		} 
		
		if(isValid) {
			this.isCCNvalid = true;
			
			this.setImage("SELECTED");
			
			if($.isFunction(this.config.OnValidationSuccess)){				
				this.config.OnValidationSuccess(this);
			}		
			
		} else {
			this.isCCNvalid = false;
			this.setImage("NOTSELECTED");
			
			if($.isFunction(this.config.OnValidationFailure)){				
				this.config.OnValidationFailure(this);
			}
		}
    },
	setImage: function(type){
		if(this.$imageDivID.length > 0)
		{
			if(type == "none" || this.card == null) {
				this.$imageDivID.attr('class', 'CC CC-NONE');
			}else{
				this.$imageDivID.attr('class', "CC " + this.card.imageclass + "-" + type);
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
	scriptPath: function(name) {
		var scripts = document.getElementsByTagName('script');
		var script = null;
        jQuery.each(scripts, function(index,value)
		{
			var fileIndex = value.src.indexOf(name);
			if(fileIndex != -1)
			{
				script = value.src.substr(0,fileIndex);
				return false;
			}
		});

		if (script.length !== undefined) {			
			return script;
		}
		return script.getAttribute('src', -1);
	},
	defaults: {
		// "At this level of abstraction, nothing makes sense" - Steve 
		imageDivID: "imageDivID",
		inputTextBoxID: "ccnTextBox",
		ccvTextBoxID: "ccvTextBox",
		OnDisabledCard: function(ValidateCreditCard, card) {	
			ValidateCreditCard.ccnTextBox.val('');			
			alert("We do not accept " + card.name + ". Please try a different card.");			
		},
		OnCardTypeFound: function( ValidateCreditCard, card ) {			
		},
		OnCardTypeError: function(ValidateCreditCard) { 			
		},
		OnValidationSuccess: function(ValidateCreditCard){ 						
		},
		OnValidationFailure: function(ValidateCreditCard){ 						
		},
		/*OnValidationCCVSuccess: function(ValidateCCV) {			
		},
		OnValidationCCVFailure: function(ValidateCCV) {			
		},		
		OnValidationAllSuccess: function (ValidateAll) {
			// This needs to return to main page
			// now call a callback function
			this.callback.call(this);			
		},*/		
		cards:[
			{
				name:'Master Card',
				numbersizes:[16],
				checksum: mod10,
				iin: [51,52,53,54,55],
				imageclass:'MASTER',
				csc:'CVC2',
				accept:true
			},
			{
				name:'Visa',
				numbersizes:[ 13,16],
				checksum: mod10,
				iin: [4],
				imageclass:'VISA',
				csc: 'CVV2',
				accept:true
			},
			{
				name:'American Express',
				numbersizes:[15],
				checksum: mod10,
				imageclass:'AE',
				iin:[34,37],
				csc:'CID',
				accept:false
			},
			{
				name:'Discover',
				numbersizes:[16],
				checksum: mod10,
				imageclass:'DISCOVER',
				iin:[6011,622,64,65],
				csc:'CID',
				accept:true
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
				name: "Card Verification Value",
				id:'CVC2',
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
