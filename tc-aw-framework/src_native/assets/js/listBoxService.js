// Copyright (c) 2020 Siemens

/**
 * Utility Service For list. This service takes the output from the SOA for display in the listbox.
 *
 * @module js/listBoxService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import _ from 'lodash';

var exports = {};

/**
 * Get ModelObjects from given array
 *
 * @return {ObjectArray} - Model Objects.
 */
var _getModelObjects = function( modelObjectsArray ) {
    var modelObjects = [];
    for( var i in modelObjectsArray ) {
        if( modelObjectsArray[ i ].uid ) {
            modelObjects.push( cdm.getObject( modelObjectsArray[ i ].uid ) );
        } else {
            modelObjects.push( modelObjectsArray[ i ] );
        }
    }
    return modelObjects;
};

/**
 * Return an empty ListModel object.
 *
 * @return {Object} - Empty ListModel object.
 */
var _getEmptyListModel = function() {
    return {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: false
    };
};

/**
 * Given an array of objects to be represented in listbox, this function returns an array of ListModel objects for
 * consumption by the listbox widget.
 *
 * @param {ObjectArray} objArray - Array of objects
 * @param {String} path - If each object is a structure, then this is the path to the display string in each object;
 *            If each object represents a Model Object, then path is the Model Object property which holds the
 *            display value
 * @param {boolean} addEmpty1stItem - true if add empty item to head of list
 *
 * @return {ObjectArray} - Array of ListModel objects.
 */
export let createListModelObjects = function( objArray, path, addEmpty1stItem ) {
    var listModels = [];
    var listModel = null;
    if( addEmpty1stItem ) {
        listModel = _getEmptyListModel();
        listModels.push( listModel );
    }
    var modelObjects = _getModelObjects( objArray );

    _.forEach( modelObjects, function( modelObj ) {
        var dobj = _.get( modelObj, path );

        var dispName;

        if( modelObj.props ) {
            dispName = dobj.getDisplayValue();
        } else {
            dispName = dobj;
        }
        listModel = _getEmptyListModel();

        listModel.propDisplayValue = dispName;
        listModel.propInternalValue = modelObj;

        listModels.push( listModel );
    } );

    return listModels;
};

/**
 * Given an array of Strings to be represented in listbox, this function returns an array of ListModel objects for
 * consumption by the listbox widget.
 *
 * @param {ObjectArray} strings - The Strings array
 *
 * @return {ObjectArray} - Array of ListModel objects.
 */
export let createListModelObjectsFromStrings = function( strings ) {
    var listModels = [];

    _.forEach( strings, function( str ) {
        var listModel = _getEmptyListModel();

        if( cmm.containsType( str ) ) {
            var type = cmm.getType( str );

            listModel.propDisplayValue = type.displayName;
            listModel.propInternalValue = type.name;
        } else {
            listModel.propDisplayValue = str;
            listModel.propInternalValue = str;
        }

        listModels.push( listModel );
    } );

    return listModels;
};

exports = {
    createListModelObjects,
    createListModelObjectsFromStrings
};
export default exports;
/**
 * Utility service for converting static lists to array of ListModel objects for consumption by listbox widget.
 *
 * @member listBoxService
 * @memberof NgServices
 */
app.factory( 'listBoxService', () => exports );
