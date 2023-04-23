// Copyright (c) 2020 Siemens

/**
 * @module js/wysPropertiesPanelService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import localeService from 'js/localeService';
import localizationPanelService from 'js/localizationPanelService';
import wysiwygXmlParserService from 'js/wysiwygXmlParserService';
import viewModelService from 'js/viewModelService';
import arrayTypePropertyParserService from 'js/arrayTypePropertyParserService';
import mockDataEditorService from 'js/mockDataEditorService';
import wysActionTypePropertyService from 'js/wysActionTypePropertyService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import parsingUtils from 'js/parsingUtils';

var exports = {};

var htmlNode = null;
var _canvasData;
var _declViewModel;

export let storesubPanelContext = function( data, subPanelContext ) {
    data.canvasData = subPanelContext;
};

var adoptToAptType = function( property, propValue ) {
    //If there is no prop value, set empty.
    if( !_.isUndefined( propValue ) && !_.isNull( propValue ) ) {
        switch ( property.type ) {
            case 'string':
                propValue = propValue.toString();
                break;
            case 'boolean':
                propValue = _.isBoolean( propValue ) ? propValue : propValue === 'true';
                break;
            default:
                break;
        }
    } else {
        propValue = '';
    }

    return propValue;
};

/*
 * refVMLookup: associated viewmodel section
 * isViewProperty: Is it a property defined in the view
 * hasVMBinding: Does it have an associated object in the VM
 * attrValuePrefix: prefix to be appened with the attr value when defining in the view
 */

var Property = function( prop, htmlNode ) {
    this.name = prop.name;
    this.type = prop.type;
    this.children = [];
    this.parentProp = null;
    this.htmlNode = htmlNode;
    this.refVMLookup = prop.refVMLookup;
    this.isViewProperty = prop.isViewProperty === 'true';
    this.savedbValue = this.savePropertyValue();
    this.hasVMBinding = prop.hasVMBinding === 'true';
    this.attrValuePrefix = prop.attrValuePrefix ? prop.attrValuePrefix : '';
    this.isI18nSupported = prop.isI18nSupported;
    this.renderingHint = prop.renderingHint;
    this.displayValue = prop.displayValue;
    this.validationCriteria = prop.validationCriteria;
    this.identifier = prop.identifier;
    this.enabled = prop.enabled;
    this.isActionProperty = prop.isActionProperty;
    this.validationMsg = prop.validationMsg && prop.validationMsg.search( '{{i18n' ) > -1 ? localeService.getLoadedTextFromKey( 'propEditorMessages.' + [ parsingUtils.geti18nKey( prop.validationMsg ) ] ) : prop.validationMsg;
    if( prop.defaultValues ) {
        this.defaultValues = prop.defaultValues;
    }
    if( prop.items ) {
        this.items = prop.items;
    }
};

Property.prototype.addChild = function( childProp ) {
    this.children.push( childProp );
    childProp.addParent( this );
};

Property.prototype.addParent = function( parentProp ) {
    this.parentProp = parentProp;
};

Property.prototype.savePropertyValue = function() {
    /*eslint-disable */
    var property = this;
    return function() {
        var dbValue = adoptToAptType( property, property.vmProp.dbValue );
        if( property.isI18nSupported ) {
            //handle the i18n lov widget
            saveI18nPropertyValue( property );
        } else if( property.isViewProperty && dbValue !== property.initialValue ) {
            var propValue = property.attrValuePrefix.length > 0 ? property.attrValuePrefix + '.' + dbValue : dbValue;
            property.htmlNode.setAttribute( property.name, propValue );

            if( property.refVMLookup && property.refVMLookup.length > 0 ) {
                // update the viewModel
                // get the oldViewModel
                var oldViewModelKey = property.refVMLookup + '.' + property.initialValue;
                var newKey = property.refVMLookup + '.' + dbValue;

                if( property.isActionProperty == 'true' ) {
                    wysActionTypePropertyService.createActionObj( _canvasData.viewModel, dbValue );
                } else {
                    // If view Model exist with old key, clone it and set ir with new key
                    // Otherwise create a new entry.
                    var elementViewModel = _.get( _canvasData.viewModel, oldViewModelKey );
                    if( elementViewModel ) {
                        _.set( _canvasData.viewModel, newKey, _.clone( elementViewModel ) );
                    } else {
                        _.set( _canvasData.viewModel, newKey, {} );
                    }
                }
            }
        } else if( property.parentProp && property.initialValue !== dbValue ) {
            // get the parent property key
            // for "actionType", we need to get the key for its parent action
            /**
             *   {
             *      "actions":{
             *          "loadAction":{
             *              "actionType": "jsFunction",
             *              "method":"loadDataFromServer"
             *              }
             *          }
             *    }
             *    To save actionType, we need to get the parent json object "loadAction".
             *    if does not exist create it.
             *
             *
             */

            var vmKey = getNestedHierachy( property );
            var propViewModel = _.get( _canvasData.viewModel, vmKey );
            if( !propViewModel ) {
                _.set( _canvasData.viewModel, vmKey, {} );
            }

            var propKey = vmKey + '.' + property.name;
            if( property.type === 'array' ) {
                dbValue = dbValue.getUpdatedValue( property, propViewModel[ property.name ] );
            } else if( property.isActionProperty == 'true' ) {
                wysActionTypePropertyService.createActionObj( _canvasData.viewModel, dbValue );
            }
            _.set( _canvasData.viewModel, propKey, dbValue );
        }

        //specific processing only for aw-splm-table column configuration
        if( property.htmlNode.nodeName === 'aw-splm-table' && property.name === 'columns' ) {
            mockDataEditorService.updateDataForWysTable( property, _declViewModel );
        }
    };
};

function getNestedHierachy( prop ) {
    let nestedHierachy = [];
    while( prop && prop.parentProp && !prop.parentProp.refVMLookup ) {
        nestedHierachy.push( prop.parentProp.name );
        prop = prop.parentProp;
    }
    let childHierachy = nestedHierachy.length > 0 ? nestedHierachy.reverse().join( "." ) : null;
    let partialNode = prop && prop.parentProp ? prop.parentProp.refVMLookup + '.' + prop.parentProp.vmProp.dbValue : "";
    return childHierachy ? partialNode + '.' + childHierachy : partialNode;
}

Property.prototype.retrivePropertyValueFromVM = function() {
    var propValue = null;
    if( this.isI18nSupported && this.name === 'buttonDisplayName' ) {
        var children = getChildrenFromChildNodes( this.htmlNode.childNodes );
        if( children.length > 0 ) {
            if( children[ 0 ].children[ 0 ] !== undefined ) {
                propValue = children[ 0 ].children[ 0 ].textContent.trim();
            } else {
                propValue = children[ 0 ].textContent.trim();
            }

        } else {
            propValue = this.htmlNode.textContent.trim();
        }
    } else if( this.isViewProperty ) {
        propValue = this.htmlNode.getAttribute( this.name );
        if( propValue && propValue.length > 0 ) {
            // this will give the prefix of the actual property name, in case dataprovider it is "data.dataProviders"
            var viewAttrlength = this.attrValuePrefix ? this.attrValuePrefix.length + 1 : 0;
            // This will get the actual value of the attribute, parsing "data.name", will give "name"
            propValue = propValue.startsWith( this.attrValuePrefix ) ? propValue.substring( viewAttrlength ) : propValue;
        } else {
            propValue = '';
        }
    } else if( this.parentProp ) {
        let parentPropValue = this.parentProp.vmProp.dbValue;
        let viewModel = "";
        if( this.parentProp.refVMLookup ) {
            var key = this.parentProp.refVMLookup + '.' + parentPropValue;
            viewModel = _.get( _canvasData.viewModel, key );
        } else {
            viewModel = parentPropValue;
        }
        if( viewModel ) {
            propValue = viewModel[ this.name ];
        }
    }

    if( this.type === 'array' && propValue ) {
        propValue = arrayTypePropertyParserService.parseArrayTypeProperty( this, propValue );
    }
    propValue = adoptToAptType( this, propValue );

    uwPropertyService.setValue( this.vmProp, propValue );
    this.initialValue = _.cloneDeep( propValue );
};

var validateProperty = function( property ) {
    var conditionName = 'invalid' + property.name;
    _declViewModel[ property.vmProp.propertyName ] = property.vmProp;
    var conditions = {
        name: conditionName,
        expression: {
            '$source': 'data.' + property.vmProp.propertyName + '.dbValue',
            '$query': {
                '$notinregexp': property.validationCriteria
            }
        }
    };
    var msgString = property.validationMsg || localeService.getLoadedTextFromKey( 'propEditorMessages.invalidPropertyValue' );
    viewModelService.attachValidationCriteria( _declViewModel, property.vmProp.propertyName, conditions, msgString, _declViewModel._internal.origCtxNode )
};

var setRenderingHintSpecificConfig = ( property ) => {
    switch ( property.renderingHint ) {
        case 'radio':
            property.vmProp.vertical = true;
            break;
        case 'table':
            _declViewModel.mockEditorData = property.vmProp.dbValue.viewModelObjects;
            _declViewModel.mockEditorColumns = mockDataEditorService.createMockEditorColumnData( property );
            break;
        default:
            break;
    }
};

var createVMProperty = function( property ) {
    var propUiValue = property.displayValue ? localeService.getLoadedTextFromKey( 'propEditorMessages.' + property.displayValue.slice( 7, -2 ) ) : property.name;
    property.vmProp = uwPropertyService.createViewModelProperty( property.name, propUiValue, property.type.toUpperCase(), '', '' );
    uwPropertyService.setIsEditable( property.vmProp, true );
    uwPropertyService.setIsEnabled( property.vmProp, property.enabled ? JSON.parse( property.enabled ) : true );
    if( property.isI18nSupported ) {
        setAndUpdateI18nVmProperty( property, propUiValue );
    } else if( property.isActionProperty === 'true' ) {
        property.vmProp = _.cloneDeep( _declViewModel.actionProp );
        property.retrivePropertyValueFromVM();
        property.vmProp.uiValue = property.vmProp.dbValue;
        property.vmProp.anchor = 'wys_editAction';
    } else {
        property.retrivePropertyValueFromVM();
        setRenderingHintSpecificConfig( property );
    }
    //specific processing only for aw-splm-table column configuration
    if( property.htmlNode.nodeName === 'aw-splm-table' && property.name === 'columns' ) {
        _declViewModel.wysTableData = mockDataEditorService.getWysTableMockData( property, _canvasData.viewModel );
    }
};

var propertyParser = function( propertyDef ) {
    var rootProp = new Property( propertyDef, htmlNode );
    var rootProperties = [ rootProp ];
    createVMProperty( rootProp );
    if( rootProp.validationCriteria ) {
        validateProperty( rootProp );
    }
    _.forEach( propertyDef.properties, function traverse( propDef ) {
        var childProp = new Property( propDef, htmlNode );
        rootProperties[ 0 ].addChild( childProp );
        createVMProperty( childProp );
        if( childProp.validationCriteria ) {
            validateProperty( childProp );
        }

        if( propDef.properties ) {
            rootProperties.unshift( childProp );
            _.forEach( propDef.properties, traverse );
            rootProperties.shift();
        }
    } );
    return [ rootProp ];
};

var getChildrenFromChildNodes = function( childNodes ) {
    var children = [];
    _.forEach( childNodes, function( node ) {
        if( node.nodeType === 1 ) {
            children.push( node );
        }
    } );
    return children;
};

var updateButtonPropertyWithNewDisplayValue = function( property, newViewPropValue ) {
    if( newViewPropValue.indexOf( 'i18n.' ) !== -1 ) {
        property.htmlNode.innerHTML = '';
        $( property.htmlNode ).append( `<aw-i18n>${newViewPropValue}</aw-i18n>` );
    } else {
        property.htmlNode.textContent = newViewPropValue;
    }
};

/**
 * Set and update the view property with view model property for caption property.
 * @param {Object} property view Property
 */
function saveI18nPropertyValue( property ) {
    var newViewPropValue = null;
    var newI18nSource;
    if( property.vmProp.selectedI18nKeyValue && property.vmProp.selectedI18nKeyValue.length > 0 ) {
        if( property.vmProp.selectedI18nKeyValue[ 0 ].i18nKey && property.vmProp.selectedI18nKeyValue[ 0 ].i18nSource ) {
            var i18nkey = property.vmProp.selectedI18nKeyValue[ 0 ].i18nKey;
            newI18nSource = property.vmProp.selectedI18nKeyValue[ 0 ].i18nSource;
            newViewPropValue = 'i18n.' + i18nkey;
        } else {
            newViewPropValue = property.vmProp.selectedI18nKeyValue[ 0 ].propInternalValue;
        }
    } else {
        newViewPropValue = property.vmProp.dbValue;
    }

    if( newViewPropValue !== null ) {
        if( property.isViewProperty ) {
            //Update view
            property.htmlNode.setAttribute( property.name, newViewPropValue );
            //Update view model
            if( newI18nSource ) {
                _.set( _canvasData.viewModel, newViewPropValue, [ newI18nSource ] );
            }
        } else if( property.name === 'buttonDisplayName' ) {
            //Update html i18n node value
            var children = getChildrenFromChildNodes( property.htmlNode.childNodes );
            if( children.length > 0 ) {
                if( children[ 0 ].children[ 0 ] !== undefined ) {
                    children[ 0 ].children[ 0 ].textContent = newViewPropValue;
                } else {
                    children[ 0 ].textContent = newViewPropValue;
                }
            } else {
                updateButtonPropertyWithNewDisplayValue( property, newViewPropValue );
            }
            //Update view model
            if( newI18nSource ) {
                _.set( _canvasData.viewModel, newViewPropValue, [ newI18nSource ] );
            }
        } else {
            var vmKey = property.parentProp.refVMLookup + '.' + property.parentProp.vmProp.dbValue;
            var propViewModel = _.get( _canvasData.viewModel, vmKey );
            if( !propViewModel ) {
                _.set( _canvasData.viewModel, vmKey, {} );
            }
            var propKey = vmKey + '.' + property.name;
            var propValue = newViewPropValue.includes( 'i18n.' ) ? '{{' + newViewPropValue + '}}' : newViewPropValue;
            _.set( _canvasData.viewModel, propKey, propValue );
            //Update view model
            if( newI18nSource ) {
                _.set( _canvasData.viewModel, newViewPropValue, [ newI18nSource ] );
            }
        }
    }
}
/**
 * Set and update the view property with view model property for caption property.
 * @param {Object} prop view Property
 * @param {Object} displayValue prop display value
 */
function setAndUpdateI18nVmProperty( prop, displayValue ) {
    uwPropertyService.setPropertyDisplayName( prop.vmProp, displayValue );
    prop.retrivePropertyValueFromVM();

    if( prop.vmProp.dbValue.indexOf( 'i18n.' ) !== -1 && prop.vmProp.dbValue.indexOf( 'conditions.' ) === -1 && prop.vmProp.dbValue.indexOf( 'ctx.' ) === -1 ) {
        localizationPanelService.retrieveI18nValue( prop.vmProp, _canvasData.viewModel, prop.vmProp.dbValue );
    } else {
        prop.vmProp.anchor = 'aw_i18nAddLocaleAnchor';
        prop.vmProp.isEnabled = true;
    }
};

var isErrorSet = function( property ) {
    if( property.vmProp.validationCriteria && property.vmProp.validationCriteria[ 0 ] !== null ) {
        return true;
    } else if( property.children.length > 0 ) {
        return property.children.some( isErrorSet );
    }
}
export let updatePropValue = function( baseproperty ) {
    var isPropError = false;
    isPropError = baseproperty.some( isErrorSet );

    if( isPropError ) {
        eventBus.publish( 'wysiwyg.propertyValueError', {} );
    } else {
        _.forEach( baseproperty, function( baseProp ) {
            baseProp.savedbValue();
            _.forEach( baseProp.children, function traverse( prop ) {
                prop.savedbValue();
                if( prop.children && prop.children.length > 0 ) {
                    _.forEach( prop.children, traverse );
                }
            } );
        } );
        eventBus.publish( 'aw.canvas.regenerate' );
    }
};

export let createProp = function( declViewModel ) {
    _canvasData = declViewModel.canvasData;
    _declViewModel = declViewModel;
    var baseproperty = [];
    if( _canvasData && _canvasData.currentSelectedElementId ) {
        var schema = appCtxService.getCtx( 'wysiwyg.propPanel.configurations' );
        htmlNode = wysiwygXmlParserService.getElementById( _canvasData.canvasModel, _canvasData.currentSelectedElementId );
        if( htmlNode ) {
            var nodeName = htmlNode.nodeName.toLowerCase();
            var elementConfig = schema.inputProperties[ nodeName ];
            if( elementConfig ) {
                _.forEach( elementConfig, function( inputProp ) {
                    var propertyDef = schema.widgetattrdef[ inputProp ];
                    baseproperty = baseproperty.concat( propertyParser( propertyDef ) );
                } );
            }
        }
    }
    return baseproperty;
}

exports = {
    storesubPanelContext,
    updatePropValue,
    createProp
};
export default exports;
app.factory( 'wysPropertiesPanelService', () => exports );
