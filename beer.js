var storeNumber = 511;
var searchString = "beer";
var desiredPrimaryCategory = "Beer"; //"primary_category" attribute of the desired product, to make sure it is really beer (can't search by this)
var recordsPerPage = 5; //API docs don't mention this, but minimum per page is 5

//Possible products, by index within search results.
//This will change with the store's product selection, and therefore is created fresh each time this page is used.
var possibleProductIndices = []; 

var storagePrefix = "beer"; //prefix storage keys to be polite

/* 
 * Gets a random beer and displays it on the page
 */
function getRandomBeer(){
	
	searchUI(true);
	
	console.log("possible beers remaining: " + possibleProductIndices.length);	

	if(possibleProductIndices.length == 0){		
		//this isn't expected to happen for a long time...
		$("#beerLoading").html("No more beer!");
	}else{
	
		//Find a random product index, from 0 to numMatchingProducts - 1
		//Use the array to avoid selecting the same index twice, and to know if somehow all the beers have been rejected.
		var arrayIndex = Math.floor(Math.random() * possibleProductIndices.length);	
		var randomProductIndex = possibleProductIndices[arrayIndex];
		possibleProductIndices.splice(arrayIndex, 1); //remove from array
							
		var pageNumber = Math.floor(randomProductIndex / recordsPerPage) + 1;			
		var indexOnPage = randomProductIndex % recordsPerPage;	
			
		$.ajax({
		  //note: contrary to the API doc, "where_not=is_dead" doesn't seem necessary... looks like dead products aren't included unless specifically requested with where="is_dead"
		  url: "http://lcboapi.com/products?store_id=" + storeNumber + "&q=" + searchString + "&per_page=" + recordsPerPage + "&where_not=is_dead&page=" + pageNumber,
		  dataType: "jsonp"
		
		}).then(function(data) {	
			//there are some criteria that can't be included (as far as I can find...) in the original search, need to check them separately
			var theBeer = data.result[indexOnPage];
			verifyBeerSelection(theBeer);				
		});	
	
	}
	
}

/*
 * Checks if the beer selection is acceptable, by these criteria:
 * - It is actually a beer (note: sake is categorized as "beer" for some reason, sometimes this app gives sake)
 * - It is in stock
 * - It has not been selected before
 */
function verifyBeerSelection(theBeer){

		console.log("Selected product #" + theBeer.id + " - " + theBeer.name + ", verifying selection...")							;
								
		if(theBeer.primary_category != desiredPrimaryCategory){			
			//filter for the occasional non-beer with the word "beer" in the name (e.g. beer-themed tote bag, non-alcoholic beer...)			
			rejectBeer(theBeer, "Not a beer");				
		} else if (	localStorage.getItem(storagePrefix + theBeer.id) != null){						
			rejectBeer(theBeer, "Already selected");				
		} else {		
	
			//verify store inventory - requires a separate search
			$.ajax({			  
			  url: "http://lcboapi.com/stores/" + storeNumber + "/products/" + theBeer.id + "/inventory",
			  dataType: "jsonp"			
			}).then(function(data) {
				var numberInStock = data.result.quantity;			
				if(numberInStock > 0){	
					acceptBeer(theBeer, numberInStock);							
				} else {
					//Occasionally there is no inventory of a beer they normally have in stock - try again if this is the case.
					rejectBeer(theBeer, "Not in stock");
				}
			});
						
		}
}

/*
 * If a beer is accepted, display on the page and store its product ID
 */
function acceptBeer(theBeer, numberInStock){	
	
	console.log("#" + theBeer.id + " accepted!");
	
	$("#beerName").html(theBeer.name);
	
	var imageUrl = theBeer.image_thumb_url;
	
	if(theBeer.image_thumb_url != null){
		$("#beerImage").html("<img src=\'" + theBeer.image_thumb_url + "\'/>");		
	} else if (theBeer.image_url != null){		
		$("#beerImage").html("<img src=\'" + theBeer.image_url + "\' height=\'319\' width=\'239\' />");
	} else{
		$("#beerImage").html("<br/>[no image]");
	}
		
	$("#stockQuantity").html(numberInStock);

	localStorage.setItem(storagePrefix + theBeer.id, "selected");	
		
	searchUI(false);
}

/*
 * If a beer is rejected, try again
 */
function rejectBeer(theBeer, reason){
	console.log("#" + theBeer.id + " - " + theBeer.name + " REJECTED: " + reason + ". Finding a new beer.");	
	getRandomBeer();	
}

/*
 * Toggles search mode UI
 */
 function searchUI(showSearchUI){
	if(showSearchUI){
		$("#beerInfo").hide();
		$("#beerLoading").show();	
	} else{
		$("#beerInfo").show();
		$("#beerLoading").hide();
	}	
	$("#getBeer").prop('disabled', showSearchUI);	
}

$( document ).ready(function() {					
	//on load, get a response with the fewest results possible to get the total number of matching products at the desired store
	$.ajax({
	  url: "http://lcboapi.com/products?store_id=" + storeNumber + "&q=" + searchString + "&per_page=" + recordsPerPage + "&where_not=is_dead",
	  dataType: "jsonp",
	  success: function(data){
		numMatchingProducts = data.pager.total_record_count;
		
		for(var i = 0; i < numMatchingProducts; i++){
			possibleProductIndices.push(i);			
		}	
		
		//show button after everything in loaded
		$("#getBeer").show();		
		$("#getBeer").click();
	  }
	});	
			
});



