/* eslint-disable complexity */
// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 *
 *
 * @module js/aw-cls-list.directive
 */
import * as app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'jquery';
import 'js/aw-list.directive';
import 'js/viewModelService';
import 'js/aw-link-with-popup-menu.directive';
import 'js/exist-when.directive';
import 'js/aw-property-non-edit-val.directive';
import 'js/dataProviderFactory';
import 'js/declDataProviderService';
import 'soa/kernel/soaService';
import 'js/uwPropertyService';

var selectionChangeEvent = null;
var textBoxChangeEvent = null;

export let NOTCOMPLEXPROPERTY = 4;
export let COMPLEXPROPERTY = 5;
export let NODATARESULT = '0';
export let CSTPREFIX = 'cst0';
export let COMPLEXFORMATTYPE = 2;
export let FORMATTYPE = 2;
export let MODIFIER1 = 0;
export let COMPLEXMODIFIER2 = 6;
export let COMPLEXFORMATLENGTH = 12;
export let EXTRATIMELENGTH = 4;
export let FORMATLENGTH = 12;
export let INVALID_FORMAT_MOD = 0;
export let DEFAULT_FORMAT_MOD = 1;
export let AXIS = 9;
export let UNITVMO = 2;
/**
 * Directive to display intent with families and list of values in a popup.<br>
 *
 * <pre>
 *  Directive Attribute Usage:
 *      display - (Required) The display object of which values to be rendered in popup.
 *      currentValue - (Required) The current selected value for a display.
 *      availableIntentValues - (Required) List of available values for a display.
 *      attribute - (Required) the attribute the annotation belongs to.
 * </pre>
 *
 * @example <aw-cls-list display="display"
 * current-value="display.currentValue" available-intent-values=
 * "data.units"></aw-cls-list>
 *
 */
app.directive(
    'awClsList',
    [
        'viewModelService',
        'dataProviderFactory',
        'declDataProviderService',
        'soa_kernel_soaService',
        'uwPropertyService',
        function( viewModelSvc, dataProviderFactory, declDataProviderSvc, soaService, uwProp ) {
            return {
                restrict: 'E',
                scope: {
                    display: '=',
                    currentValue: '=',
                    availableIntentValues: '=',
                    attribute: '=',
                    data: '=',
                    parent: '='
                },
                templateUrl: app.getBaseUrlPath() + '/html/aw-cls-list.directive.html',
                controller: [
                    '$scope',
                    function( $scope ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        var dataProviderName = $scope.parent.id;
                        var data = $scope.data;
                        var parent = $scope.parent;
                        $scope.spinlock = false;
                        var items = new Set();
                        $scope.listItems = [];
                        for ( var unit = 0; unit < $scope.currentValue.names.length; unit++ ) {
                            var temp2 = $scope.currentValue.names[unit].toString();
                                items.add( temp2 );
                        }

                        //$scope.currentValue.names = Array.from( items );
                        var dataProviderJson = {
                            dataProviderType: 'Static',
                            response: $scope.currentValue.names, // Populate the response array with the values in current display.
                            totalFound: $scope.availableIntentValues.length
                        };

                        // Instantiate the dataprovider
                        if( !declViewModel.dataProviders ) {
                            declViewModel.dataProviders = {};
                        }
                        $scope.intentValuesProvider = new dataProviderFactory.createDataProvider( dataProviderJson,
                            null, dataProviderName, declDataProviderSvc );
                        declViewModel.dataProviders[ dataProviderName ] = $scope.intentValuesProvider;
                        $scope.setConvertedValues = function( data ) {
                            if ( data.convertedValues && data.convertedValues[0].convertedValues ) {
                                var convertedValues = data.convertedValues[0].convertedValues;
                                try {
                                    if (  data.panelMode === -1 ) {
                                        $scope.parent.vmos[0].uiValue = $scope.parent.unitSystem.startNum;
                                        $scope.parent.vmos[0].convertedValue = convertedValues;
                                        uwProp.setValue( $scope.parent.vmos[0], convertedValues );
                                        uwProp.setValue( $scope.parent.vmos[1], convertedValues );
                                        uwProp.setValue( $scope.parent.vmos[2], convertedValues );
                                    }
                                } catch ( err ) {
                                console.error( err );
                                }
                            }
                        };
                        $scope.convertSingleAttr = function( data, attribute, newUnitName ) {
                                try {
                                    var tempAttrId = attribute.id;
                                    var tempAttrPrefix = attribute.prefix;
                                    var isCstAttr = Boolean( tempAttrId.substring( 0, 4 ) === CSTPREFIX || tempAttrPrefix.substring( 0, 4 ) === CSTPREFIX );
                                    if ( attribute.type !== 'Block' && !attribute.isCardinalControl && attribute.unitSystem.formatDefinition.formatType < COMPLEXPROPERTY ) {
                                        var vmo = attribute.vmos[0];
                                        var unitSystem;
                                        if( !data.unitSystem.dbValue ) {
                                            unitSystem = vmo.nonMetricFormat;
                                        } else {
                                            unitSystem = vmo.metricFormat;
                                        }
                                        if ( _.isArray( vmo.dbValue ) ) {
                                            if ( !unitSystem.startNum  ) {
                                                unitSystem.startNum = vmo.dbValue[0];
                                            }
                                        } else {
                                            if ( !unitSystem.startNum && vmo.dbValue ) {
                                                unitSystem.startNum = vmo.dbValue;
                                            }
                                        }
                                        if ( vmo.value && _.isArray( vmo.value ) && !_.isArray( vmo.dbValue ) ) {
                                            unitSystem.startNum = vmo.value;
                                        }
                                        if ( vmo.value && _.isArray( vmo.value ) && !_.isArray( unitSystem.startNum ) ) {
                                            unitSystem.startNum = vmo.value;
                                        }
                                        var conversion = {
                                            inputValues: [],
                                            options: 0
                                        };
                                        if ( vmo.originalSystem ) {
                                            unitSystem = vmo.originalSystem;
                                            unitSystem.startNum = vmo.metricFormat.startNum;
                                        }
                                        if ( !unitSystem.startValue ) {
                                            unitSystem.startValue = unitSystem.unitName;
                                        }
                                        switch( data.panelMode ) {
                                            case -1: //View Mode
                                                _.forEach( attribute.vmos[ 2 ].unitDefs, function( unit ) {
                                                    if( unit.displayName === newUnitName ) {
                                                        conversion.outputUnit = unit.unitID;
                                                    }
                                                    if( unit.displayName === unitSystem.startValue ) {
                                                        conversion.inputUnit = unit.unitID;
                                                    }
                                                } );
                                                if ( unitSystem.startNum ) {
                                                    if ( _.isArray( unitSystem.startNum ) ) {
                                                        _.forEach( unitSystem.startNum, function( value ) {
                                                            conversion.inputValues.push( value.toString() );
                                                        } );
                                                    } else {
                                                        conversion.inputValues.push( unitSystem.startNum.toString() );
                                                    }
                                                } else {
                                                    if ( vmo.dbValue ) {
                                                        conversion.inputValues.push( vmo.dbValue.toString() );
                                                    } else {
                                                        conversion.inputValues.push( vmo.displayValue[0].toString() );
                                                    }
                                                }
                                                break;
                                            case 0: // Create View
                                                return;
                                            case 1: // Edit View
                                                return;
                                        }
                                        //By this point, unitSystem represents the new/desired unit system.
                                        attribute.attrDefn.updateViewPropForUnitSystem( data, attribute, unitSystem, isCstAttr );
                                        conversion.outputFormat = unitSystem.formatDefinition;
                                        if ( conversion.outputFormat.formatModifier1 < INVALID_FORMAT_MOD ) {
                                            conversion.outputFormat.formatModifier1 = DEFAULT_FORMAT_MOD;
                                        }
                                        if ( conversion.outputFormat.formatModifier2 < INVALID_FORMAT_MOD ) {
                                            conversion.outputFormat.formatModifier2 = DEFAULT_FORMAT_MOD;
                                        }
                                        //Platform Cannot find time units with platform internal names, must be changes to full unit labels and measures.
                                        return [ conversion ];
                                    } else if ( attribute.type !== 'Block' && !attribute.isCardinalControl && attribute.unitSystem.formatDefinition.formatType > NOTCOMPLEXPROPERTY ) {
                                        var index = 0;
                                        var conversion = {
                                            inputValues: [],
                                            options: 0
                                        };
                                        var results = [];
                                        _.forEach( attribute.vmos, function( prop ) {
                                            if ( prop !== attribute.vmos[1] && prop !== attribute.vmos[2] ) {
                                                results.push( $scope.convertComplexFormatProperties( data, attribute, newUnitName, index ) );
                                            }
                                            index++;
                                        } );
                                        for ( var i = 0; i < results.length; i++ ) {
                                            var prop = results[i];
                                            if ( prop[0].outputFormat.formatType === AXIS && i < 3 ) {
                                                conversion.inputValues.push( prop[0].inputValues[0] );
                                            } else if (  prop[0].outputFormat.formatType !== AXIS ) {
                                                conversion.inputValues.push( prop[0].inputValues[0] );
                                            }
                                        }
                                        conversion.inputUnit = results[0][0].inputUnit;
                                        conversion.outputUnit = results[0][0].outputUnit;
                                        conversion.outputFormat = {};
                                        conversion.outputFormat.formatType = COMPLEXFORMATTYPE;
                                        conversion.outputFormat.formatModifier1 = MODIFIER1;
                                        conversion.outputFormat.formatModifier2 = COMPLEXMODIFIER2;
                                        conversion.outputFormat.formatLength = COMPLEXFORMATLENGTH;

                                        return [ conversion ];
                                    }
                                } catch ( err ) {
                                    console.error( err );
                                }
                        };

                        $scope.changeItemSelection = function( newUnitName, scope, previous ) {
                            var request = {
                                valueConversionInputs: $scope.convertSingleAttr( data, parent, newUnitName, scope, previous )
                            };
                            if ( request && request.valueConversionInputs ) {
                                var inp = request.valueConversionInputs[0].inputUnit;
                                var out = request.valueConversionInputs[0].outputUnit;
                                if ( inp !== out && request.valueConversionInputs[0].inputValues && request.valueConversionInputs[0].inputValues[0] > 0
                                    && inp !== '' && out !== '' ) {
                                    soaService.postUnchecked( 'Classification-2016-03-Classification', 'convertValues', request )
                                        .then( function( response ) {
                                            scope.spinlock = false;
                                            if ( $scope.parent.vmos[0].backupTooltip ) { //reapply tooltip
                                                $scope.parent.vmos[0].minMaxMsg = $scope.parent.vmos[0].backupTooltip;
                                            }
                                            if ( parent.unitSystem.formatDefinition.formatType < COMPLEXPROPERTY ) {
                                                if ( !response.partialErrors && response.convertedValues[0].convertedValues[0].toString() !== NODATARESULT ) {
                                                    data.convertedValues = response.convertedValues;
                                                    scope.attribute[2].lastValidName = scope.attribute[2].dbValue;
                                                    $scope.setConvertedValues( data );
                                                } else {
                                                    if ( !scope.attribute[2].currentDisplay ) {
                                                        scope.attribute[2].currentDisplay = scope.attribute[2].propertyName;
                                                    }
                                                    if ( scope.attribute[2].lastValidName ) {
                                                        scope.attribute[2].currentDisplay = scope.attribute[2].lastValidName;
                                                    }
                                                    scope.display.propertyDisplayName = scope.attribute[2].currentDisplay;
                                                    scope.attribute[2].propertyDisplayName = scope.attribute[2].currentDisplay;
                                                    scope.attribute[2].dbValue = scope.attribute[2].currentDisplay;
                                                    scope.attribute[2].uiValue = scope.attribute[2].currentDisplay;
                                                    //error converting popup
                                                }
                                            } else if ( parent.unitSystem.formatDefinition.formatType > NOTCOMPLEXPROPERTY ) {
                                                if ( !response.partialErrors && response.convertedValues[0].convertedValues[0].toString() !== NODATARESULT ) {
                                                    try {
                                                        if (  data.panelMode === -1 ) {
                                                            var index = 0;
                                                            var valueIndex = 0;
                                                            _.forEach( $scope.parent.vmos, function( prop ) {
                                                                if ( index !== 1 && index !== 2 && response.convertedValues[0].convertedValues[valueIndex] ) {
                                                                    $scope.parent.vmos[index].uiValue = $scope.parent.unitSystem.startNum;
                                                                    $scope.parent.vmos[index].convertedValue = response.convertedValues[0].convertedValues[valueIndex];
                                                                    uwProp.setValue( $scope.parent.vmos[index], response.convertedValues[0].convertedValues[valueIndex] );
                                                                    valueIndex++;
                                                                }
                                                                if ( index === UNITVMO ) {
                                                                    scope.attribute[2].currentDisplay = out;
                                                                }
                                                                index++;
                                                            } );
                                                        }
                                                    } catch ( err ) {
                                                    console.error( err );
                                                    }
                                                } else {
                                                    if ( !scope.attribute[2].currentDisplay ) {
                                                        scope.attribute[2].currentDisplay = $scope.attribute[2].propertyName;
                                                    }
                                                    scope.display.propertyDisplayName = scope.attribute[2].currentDisplay;
                                                    scope.attribute[2].propertyDisplayName = scope.attribute[2].currentDisplay;
                                                    scope.attribute[2].dbValue = scope.attribute[2].currentDisplay;
                                                    scope.attribute[2].uiValue = scope.attribute[2].currentDisplay;
                                                    //error converting popup
                                                }
                                            }
                                        } );
                                } else if ( inp === out && request.valueConversionInputs[0].inputValues && request.valueConversionInputs[0].inputValues[0] > 0
                                    && inp !== '' && out !== '' ) {
                                        scope.spinlock = false;
                                        var num = scope.parent.vmos[0].metricFormat.startNum;
                                        scope.parent.vmos[0].uiValue = scope.parent.unitSystem.startNum;
                                        scope.parent.vmos[0].convertedValue = scope.parent.unitSystem.startNum;
                                        uwProp.setValue( scope.parent.vmos[0], num );
                                        uwProp.setValue( scope.parent.vmos[1], num );
                                        if ( scope.parent.unitSystem.formatDefinition.formatType > NOTCOMPLEXPROPERTY ) {
                                            var index = 0;
                                            var valueIndex = 0;
                                            _.forEach( scope.parent.vmos, function( prop ) {
                                                if ( index !== 1 && index !== 2 ) {
                                                    $scope.parent.vmos[index].uiValue = prop.prevDisplayValues;
                                                    $scope.parent.vmos[index].convertedValue = prop.prevDisplayValues;
                                                    uwProp.setValue( $scope.parent.vmos[index], prop.prevDisplayValues );
                                                    valueIndex++;
                                                }
                                                index++;
                                            } );
                                        }
                                } else {
                                    scope.spinlock = false;
                                }
                            } else {
                                scope.spinlock = false;
                            }
                        };
                        $scope.convertComplexFormatProperties = function( data, attribute, newUnitName, index ) {
                            try {
                                var tempAttrId = attribute.id;
                                var tempAttrPrefix = attribute.prefix;
                                var isCstAttr = Boolean( tempAttrId.substring( 0, 4 ) === CSTPREFIX || tempAttrPrefix.substring( 0, 4 ) === CSTPREFIX );
                                if ( attribute.type !== 'Block' && !attribute.isCardinalControl && attribute.unitSystem.formatDefinition.formatType > NOTCOMPLEXPROPERTY ) {
                                    var vmo = attribute.vmos[index];
                                    if ( _.isArray( vmo.dbValue ) ) {
                                        if ( !vmo.metricFormat.startNum  ) {
                                            vmo.metricFormat.startNum = vmo.dbValue[0];
                                        }
                                    } else {
                                        if ( !vmo.metricFormat.startNum && vmo.value ) {
                                            vmo.metricFormat.startNum = vmo.value;
                                        }
                                    }
                                    if ( vmo.value && _.isArray( vmo.value ) && !_.isArray( vmo.dbValue ) ) {
                                        vmo.metricFormat.startNum = vmo.value;
                                    }
                                    if ( vmo.value && _.isArray( vmo.value ) && !_.isArray( vmo.metricFormat.startNum ) ) {
                                        vmo.metricFormat.startNum = vmo.value;
                                    }
                                    var conversion = {
                                        inputValues: [],
                                        options: 0
                                    };
                                    var unitSystem;
                                    if( !data.unitSystem.dbValue ) {
                                        unitSystem = vmo.nonMetricFormat;
                                    } else {
                                        unitSystem = vmo.metricFormat;
                                    }
                                    if ( !unitSystem.startValue ) {
                                        unitSystem.startValue = unitSystem.unitName;
                                    }
                                    switch( data.panelMode ) {
                                        case -1: //View Mode
                                            _.forEach( attribute.vmos[ 2 ].unitDefs, function( unit ) {
                                                if( unit.displayName === newUnitName ) {
                                                    conversion.outputUnit = unit.unitID;
                                                }
                                                if( unit.displayName === unitSystem.startValue ) {
                                                    conversion.inputUnit = unit.unitID;
                                                }
                                            } );
                                            if ( vmo.startNum ) {
                                                if ( _.isArray( vmo.startNum ) ) {
                                                    _.forEach( vmo.startNum, function( value ) {
                                                        conversion.inputValues.push( value.toString() );
                                                    } );
                                                } else {
                                                    conversion.inputValues.push( vmo.startNum.toString() );
                                                }
                                            } else {
                                                conversion.inputValues.push( vmo.dbValue.toString() );
                                                vmo.startNum = vmo.dbValue;
                                            }
                                            break;
                                        case 0: // Create View
                                            return;
                                        case 1: // Edit View
                                            return;
                                    }
                                    //By this point, unitSystem represents the new/desired unit system.
                                    attribute.attrDefn.updateViewPropForUnitSystem( data, attribute, unitSystem, isCstAttr );
                                    conversion.outputFormat = unitSystem.formatDefinition;

                                    return [ conversion ];
                                }
                            } catch ( err ) {
                                console.error( err );
                            }
                        };
                    }
                ],
                link: function( scope ) {
                    var unRegisterPopupInitEvent = scope.$on( 'awPopupWidget.init', function() {
                        //subscribe event
                        selectionChangeEvent = eventBus.subscribe( 'awlinkPopup.selected',
                            function( eventData ) {
                                if ( scope.data.panelMode === -1 &&
                                    !scope.spinlock &&
                                    eventData.property.unitType &&
                                    eventData.property.dbValue !== eventData.previousSelect &&
                                    scope.currentValue.names.includes( eventData.property.dbValue ) &&
                                    eventData.propScope.prop.unitProp === scope.parent.vmos[0].propertyDisplayName ) {
                                        scope.spinlock = true;
                                        scope.changeItemSelection( eventData.property.dbValue, scope, eventData.previousSelect, false );
                                } else if ( eventData.property.dbValue === eventData.previousSelect && scope.parent.unitSystem.startNum ) {
                                    var convertedValues = scope.parent.unitSystem.startNum;
                                    if ( scope.parent.vmos[0].displayValue ) {
                                        scope.parent.vmos[0].displayValue[0] = convertedValues;
                                    }
                                    if ( scope.parent.vmos[0].displayValues ) {
                                        scope.parent.vmos[0].displayValues[0] = convertedValues;
                                    }
                                    if ( scope.parent.vmos[1].uiValue ) {
                                        scope.parent.vmos[1].uiValue = convertedValues;
                                    }
                                    if ( scope.parent.vmos[2].displayValues ) {
                                        scope.parent.vmos[2].displayValues[0] = convertedValues;
                                    }
                                }
                            } );
                    } );
                    //And remove it when the scope is destroyed
                    scope.$on( '$destroy', function() {
                        unRegisterPopupInitEvent();
                        if( selectionChangeEvent ) {
                            eventBus.unsubscribe( selectionChangeEvent );
                        }

                        // Nothing required for 'Event - awPopupWidget.init'. It would get tidied up automatically after de-scoping of $scope.
                        // When current scope is destroyed the listeners unbind automatically.
                    } );
                }
            };
        }
    ] );
