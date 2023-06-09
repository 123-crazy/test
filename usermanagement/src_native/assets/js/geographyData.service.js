// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This represents the data handling for the geography interactions
 * 
 * 
 * @module js/geographyData.service
 */
import app from 'app';
import notyService from 'js/NotyModule';
import soaSvc from 'soa/kernel/soaService';
import AwStateService from 'js/awStateService';


var exports = {};
var nextPage;

var _createNewLOVObject = function(displayCountries, key){
    return {
        propDisplayValue: key,
        propInternalValue: displayCountries[key]
    };
};

export let getLOVList = function( response ) {
    var displayCountries=response.displayCountries;
    var lovValues=[];
    var initialCountryValue, initialCountryObject;

    initialCountryValue=response.extraInfoOut.initialCountry;
    for (var key in displayCountries) {
        if (displayCountries.hasOwnProperty(key)) {
            if(displayCountries[key]!==initialCountryValue)
            {
                var val = _createNewLOVObject(displayCountries, key);
                lovValues.push(val);
            }
            else
            {
                initialCountryObject= _createNewLOVObject(displayCountries, key);
            }
        }
    }
    if(response.extraInfoOut.initialCountry==="")
    {
        lovValues.unshift( {
            propDisplayValue: '',
            propInternalValue: ''
        } );
    }
    else
    {
        lovValues.unshift( initialCountryObject );
    }
    
    return lovValues;
};

export let setConfidentialStatement=function(data,elementId){
    var checkStr = "";
    var outputStr ="";    
    checkStr = data.confidentialityAgreement;
    
    if ( checkStr && checkStr.includes("<html>") )
    {
        outputStr = checkStr;
    }
    else
    {
        outputStr = "<html>" + checkStr + "</html>" ;
    }
                
    if ( document.getElementById(elementId) )
    {
        document.getElementById( elementId ).innerHTML = outputStr;
    }
}
;

export let continueToNextPage=function(data) {
    var state = AwStateService.instance;
    if(state.current.data && state.current.data.nextContinuation)
    {
        nextPage= state.current.data.nextContinuation;
    }
    if(nextPage)
    {
        nextPage.resolve();
    }
};

export default exports = {
    getLOVList,
    continueToNextPage,
    setConfidentialStatement
};
/**
 * The native leave place service.
 * 
 * @member leavePlaceService
 * @memberof NgServices
 */
app.factory( 'geographyDataService', () => exports );
