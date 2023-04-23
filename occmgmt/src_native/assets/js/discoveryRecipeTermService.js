//@<COPYRIGHT>@
//==================================================
//Copyright 2021.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/**
 * @module js/discoveryRecipeTermService
 */
import app from 'app';
import uwPropertyService from 'js/uwPropertyService';
import recipeTermSvc from 'js/recipeTermService';
import localeService from 'js/localeService';
import eventBus from 'js/eventBus';

var exports = {};

var _nSelectedText = null;


/**
* Function to get the tooltip for the recipe term
*
* @param {String} recipeItem  Recipe term to display
* @return {String} Tooltip for the recipe term
*/
export let getTooltip = function( recipeItem ) {
    var strTooltip =  getRecipeLabel( recipeItem, recipeItem.criteriaDisplayValue, true );

    if( recipeTermSvc.selectedTerms( recipeItem.criteriaDisplayValue ).length <= 1 ) {
        // Single select term
        if( strTooltip !== '' ) {
            strTooltip += ': ';
        }
        var recipeValue = recipeTermSvc.getRecipeValue( recipeItem.criteriaDisplayValue );
        strTooltip += recipeValue;
    }
    else if( recipeTermSvc.selectedTerms( recipeItem.criteriaDisplayValue ).length > 1 ) {
        // N selected
        if( strTooltip !== '') {
            strTooltip += ': ';
        }
        var formattedTooltipValue = recipeTermSvc.getRecipeValue( recipeItem.criteriaDisplayValue ).replace( /\^/g, ',\n' );
        strTooltip += formattedTooltipValue;
    }
    else if( recipeItem.criteriaType === 'BoxZone' || recipeItem.criteriaType === 'PlaneZone')
    {
        strTooltip = recipeItem.criteriaDisplayValue.replace( /\"/g, '\\"' );
    }
    return strTooltip;
};

/**
* This method will extract the Label for the input recipe criteria. For e.g., a
* partition Scheme Name is a Label for a selected physical partition type.
* For Proximity if isProximityTitle is true:
*   input stream :Within 0.001 m of INTERIOR CK_SmartDiscovery/A;1-INTERIOR CK^POWERTRAIN DC_SmartDiscovery/A;1-POWERTRAIN DC
*   output       :Within 0.001 m of INTERIOR CK_SmartDiscovery/A;1-INTERIOR CK
*                 POWERTRAIN DC_SmartDiscovery/A;1-POWERTRAIN DC
*
* For Proximity if isProximityTitle is false:
*      input stream :Within 0.001 m of INTERIOR CK_SmartDiscovery/A;1-INTERIOR CK^POWERTRAIN DC_SmartDiscovery/A;1-POWERTRAIN DC
*      output       :Within 0.001 m of 2 Selected
*
* @param {String} recipeItem : Recipe term to display
* @param {String} recipeDisplayName : Recipe Criteria Display Name
* @param {Boolean} isProximityTitle Optional :Is used to implement the title/extended tooltip for proximity
* @return {String} : The recipe Label for the input recipe criteria.
*/
export let getRecipeLabel = function( recipeItem, recipeDisplayName, isProximityTitle ) {
    if ( recipeItem.criteriaType === 'Proximity' ) {
        if ( recipeDisplayName.indexOf( '^' ) > 0 ) {
            if( isProximityTitle ) {
            return recipeDisplayName.replace( /\^/g, ',\n' );
            }

            recipeDisplayName = recipeTermSvc.getProximityNSelectedLabel( _nSelectedText, recipeDisplayName );
        }
        return recipeDisplayName;
    }
    if ( recipeItem.criteriaType === 'SelectedElement' ) {
        var elementDisplayString = recipeDisplayName.split( '_$CAT_' )[0];
        if ( elementDisplayString.length === 0 ) {
            var resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/OccurrenceManagementSubsetConstants' );
            return resource.selectedElementDisplayString;
        }
    }
    return recipeDisplayName.split( '_$CAT_' )[0];
};

export let destroy = function( data, subPanelContext ){
    if ( data  && subPanelContext) {
        data.recipeTermProp = null;
        data.recipeTermLabel = null;
        data.recipeTermValue = null;
        data.deleteRecipeInInnerRecipeList = null;
        data.tooltip = null;
    }
};

export let initializeRecipeTermDisplayValues = function( data, subPanelContext ) {

    if ( data  && subPanelContext) {

        data.index = subPanelContext.index;
        var recipeItem = subPanelContext.recipeItem;

        if(!recipeItem){
            return;
        }

        _nSelectedText = data.nSelectedText.propertyDisplayName;

        // Current partition scheme type is expanded based on
        // user selection. This method will store a map for each
        // partition scheme in the recipe and its corresponding expansion state.
        data.expandPartitionSchemes = {};

        // Boolean to indicate if N selected term is shown expanded
        if(data.doShowInnerRecipeElements === undefined || (recipeItem.criteriaValues.length === 2 && recipeItem.criteriaType !== 'SelectedElement') || (recipeItem.criteriaValues.length === 1 && recipeItem.criteriaType === 'SelectedElement' ) ){
            data.doShowInnerRecipeElements = false;
        }

        // Selected 'Group' term is expanded/collapsed based
        // on user selection. This variable will store a map for each
        // group term in the recipe and its corresponding expansion state.
        data.expandGroupTerms = {};
        // Boolean to indicate if Group term is shown expanded
        data.showGroupTerms = false;

        // Representation of recipe term
        data.recipeTermProp = {};

        // N selected recipe term
        data.selectedTerms = recipeTermSvc.selectedTerms( recipeItem.criteriaDisplayValue );

        // Display name for recipe term
        var recipeTermDisplayName = '';

        if( recipeItem.criteriaType === 'Group' ) {
            //Create a view model property for storing the proximity term link property.
            recipeTermDisplayName = getRecipeLabel( recipeItem, recipeItem.criteriaDisplayValue );
        } else if( recipeItem.criteriaType === 'Proximity' ) {
            data.proximityDistanceProp = uwPropertyService.createViewModelProperty( '', '', 'STRING', '', '' );
            data.proximityDistanceProp.isEditable = true;
            data.proximityDistanceProp.dbValue = recipeTermSvc.getProximityValue( recipeItem );
            data.proximityDistanceProp.autofocus = true;

            //Create a view model property for storing the proximity term link property.
            recipeTermDisplayName = getRecipeLabel( recipeItem, recipeItem.criteriaDisplayValue );
        } else if( data.selectedTerms.length > 1 ) {
            recipeTermDisplayName = data.selectedTerms.length +  ' '  + _nSelectedText;
        }

        data.recipeTermProp = uwPropertyService.createViewModelProperty( '', recipeTermDisplayName, 'STRING', '', '' );
        data.recipeTermProp.uiValue = recipeTermDisplayName;
        data.recipeTermLabel.displayName = getRecipeLabel( recipeItem, recipeItem.criteriaDisplayValue );
        data.recipeTermValue.displayName = recipeTermSvc.getRecipeValue( recipeItem.criteriaDisplayValue );
        data.tooltip = getTooltip( recipeItem );

        data.deleteRecipeInInnerRecipeList = function( selectedValue, recipeItem, index, subCriteriaIndex ) {
            eventBus.publish( 'recipeDeleted', {
                selectedValue: selectedValue,
                recipeItem: recipeItem,
                recipeIndex: index,
                subCriteriaIndex: subCriteriaIndex
            } );
        };
    }
};

export let updateRecipeTermDisplayValues = function (data, subPanelContext, categoryName, criteriaType, criteriaOperatorType, updatedIndex ){
var shouldUpdateDisplay = false;
  if(updatedIndex && updatedIndex === subPanelContext.index){
      // Spatial term distance update
    shouldUpdateDisplay = true;
  }
  else if(criteriaType && criteriaType === 'SelectedElement' && criteriaOperatorType && criteriaOperatorType === subPanelContext.recipeItem.criteriaOperatorType &&
          criteriaType === subPanelContext.recipeItem.criteriaType ) {
    // Include/Exclude term update
    shouldUpdateDisplay = true;

  }else if(categoryName && subPanelContext.recipeItem.criteriaValues[0] === categoryName){
    // Attribute term update
    shouldUpdateDisplay = true;

  }
  if( shouldUpdateDisplay){
    initializeRecipeTermDisplayValues(data, subPanelContext);
  }

};

export default exports = {
    destroy,
    getTooltip,
    getRecipeLabel,
    updateRecipeTermDisplayValues,
    initializeRecipeTermDisplayValues
};
app.factory( 'discoveryRecipeTermService', () => exports );
