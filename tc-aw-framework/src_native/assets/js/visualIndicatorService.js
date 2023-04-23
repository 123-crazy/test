// Copyright (c) 2020 Siemens

/**
 * Service to fetch visual indicators
 *
 * @module js/visualIndicatorService
 */
import app from 'app';
import commandsMapSvc from 'js/commandsMapService';
import iconSvc from 'js/iconService';
import _ from 'lodash';
import expressionParserUtils from 'js/expressionParserUtils';
import cfgSvc from 'js/configurationService';

// Service
import AwSceService from 'js/awSceService';

import 'config/indicators';

//  FIXME this should be loaded async but before the sync API below that uses it is called
var _indicators = cfgSvc.getCfgCached( 'indicators' );

var exports = {};


let _isValidPropName = function( indicaotrProp, objPropName ) {
    var isValid = false;
    if( indicaotrProp && indicaotrProp.names && _.isArray( indicaotrProp.names ) ) {
        isValid = indicaotrProp.names.some( iPropName => iPropName === objPropName );
    }
    return isValid;
};

let _isValidModelType = function( vmoModelType, modelTypes ) {
    let isValid = false;
    if( vmoModelType && modelTypes && _.isArray( modelTypes ) ) {
        isValid = modelTypes.some( modelType => commandsMapSvc.isInstanceOf( modelType, vmoModelType ) );
    }
    return isValid;
};

let _getIndicatorsFromPreVerdict = function( preVerdictArray, getModelObjCallBack ) {
    let indicatorsArray = [];
    _.forEach( preVerdictArray, preVerdictor => {
        let refObjs = [];
        let vmoPropVal = preVerdictor.vmoProp;
        //get the array of referece object for these indicator
        if( vmoPropVal.dbValue && !_.isArray( vmoPropVal.dbValue ) ) {
            let refObjUid = vmoPropVal.dbValue;
            const refObj = getModelObjCallBack( refObjUid );
            if( refObj ) {
                refObj.uid = refObjUid;
                refObjs.push( refObj );
            }
        } else if( vmoPropVal.dbValues ) {
            vmoPropVal.dbValues.forEach( dbValue => {
                const refObj = getModelObjCallBack( dbValue );
                if( refObj ) {
                    refObj.uid = dbValue;
                    refObjs.push( refObj );
                }
            } );
        }

        _.forEach( refObjs, refObj => {
            let indicatorArray = preVerdictor.indicators;
            let verdictObjInfo = {};
            let hasDefaultIndicator = false;
            let defaultIndicator;
            _.forEach( indicatorArray, indicator => {
                let verdictObj = evaluatePropBasedCondition( indicator.prop, refObj, indicator.tooltip );
                hasDefaultIndicator = verdictObj.isDefaultIndicator;
                if( hasDefaultIndicator ) {
                    defaultIndicator = indicator;
                }
                if( verdictObj && verdictObj.hasIndicatorMatchedVal ) {
                    //Tooltip is missing some properties from target object
                    if( verdictObj.missingProps.length > 0 ) {
                        var foundProps = [];

                        //Load the properties from the original object (preVerdicator.vmoProp.parentUid)
                        const srcObj = getModelObjCallBack( preVerdictor.vmoProp.parentUid );
                        if( srcObj ) {
                            //Iterate through the list backward, remove all properties found on this object
                            //(Note there may be some properties not found in the src or target obj)
                            //(If our goal is to end checking here, we can iterate forward and clear the list)
                            for( var propIndx = verdictObj.missingProps.length - 1; propIndx >= 0; propIndx-- ) {
                                if( srcObj.props[verdictObj.missingProps[propIndx]] ) {
                                    //Assemble an object for use later when creating tooltip
                                    var propObj = { matchingVal: srcObj.props[verdictObj.missingProps[propIndx]].dbValues[ 0 ] + '\n',
                                                    tooltip: srcObj.props[verdictObj.missingProps[propIndx]].uiValues[ 0 ] + '\n',
                                                    propertyDisplayName: srcObj.props[verdictObj.missingProps[propIndx]].propertyDescriptor.displayName };
                                    foundProps.unshift( propObj );

                                    //Remove this property from the list of missing properties.
                                    verdictObj.missingProps.splice( propIndx, 1 );
                                }
                            }
                            //Iterate through the list to add to the tooltip the found properties.
                            for( var idx = 0; idx < foundProps.length; idx++ ) {
                                verdictObj.matchingVal += foundProps[idx].matchingVal;

                                //If an indicator requires property name to be displayed, we add it first.
                                if( indicator.tooltip.showPropDisplayName ) {
                                    verdictObj.tooltip += foundProps[idx].propertyDisplayName + ': ';
                                }

                                verdictObj.tooltip += foundProps[idx].tooltip;
                            }
                        }
                    }

                    verdictObj.indicator = indicator;
                    verdictObjInfo = verdictObj;
                }
            } );

            //if hasDefaultIndicator = true it has default indicator
            if( hasDefaultIndicator && defaultIndicator && _.isEmpty( verdictObjInfo ) ) {
                let targetPropNames = _.get( defaultIndicator, 'tooltip.propNames' );
                if( !targetPropNames ) {
                    targetPropNames = [ 'object_string' ];
                }
                let propUiValue = '';
                for( var targetProp in targetPropNames ) {
                    var tgtProp = targetPropNames[ targetProp ];
                    var prop = refObj.props[ tgtProp ];
                    if( prop && prop.dbValue ) {
                        propUiValue += prop.uiValue + '\n';
                    } else if( prop && prop.dbValues && prop.dbValues.length > 0 ) {
                        propUiValue += prop.uiValues[ 0 ] + '\n';
                    }
                }
                let indicator = exports.getIndicatorFromParams( defaultIndicator, propUiValue );
                indicatorsArray.push( indicator );
            } else if ( !_.isEmpty( verdictObjInfo ) ) {
                let indicator = exports.getIndicatorFromParams( verdictObjInfo.indicator, verdictObjInfo.tooltip );
                indicatorsArray.push( indicator );
            }
        } );
    } );
    return indicatorsArray;
};


/**
 * Evaluates prop based condition structure
 *
 * @return {Object} verdictObject containing indicator matching information
 * verdictObj
    {
        hasIndicatorMatchedVal   :    If input indicator has matched exact value
        matchingVal              :    What exact value indicator matched to e.g. "Approved"
        tooltip                  :   "localized(Approved)" # based on Display Name
    }
 */
export let evaluatePropBasedCondition = function( indicatorProp, obj, tooltip ) {
    let verdictObj = { isDefaultIndicator: false, missingProps: [] };
    if( indicatorProp.conditions && Object.keys( indicatorProp.conditions ).length > 0 ) {
        verdictObj.hasIndicatorMatchedVal = expressionParserUtils.evaluateConditions( indicatorProp.conditions, obj );
        if( verdictObj.hasIndicatorMatchedVal ) {
            verdictObj.uid = obj.uid;
            verdictObj.tooltip = '';
            verdictObj.matchingVal = '';
            var tooltipPropNames = tooltip.propNames;
            for( var tooltipProp in tooltipPropNames ) {
                var tooltipPropName = tooltipPropNames[ tooltipProp ];

                // 20200922 - try to validate prop exist by propertyDescriptorsMap, not object itself
                if( obj.modelType && obj.modelType.propertyDescriptorsMap && !obj.modelType.propertyDescriptorsMap.hasOwnProperty( tooltipPropName ) ) {
                    verdictObj.missingProps.push( tooltipPropName );
                    continue;
                }

                verdictObj.matchingVal += obj.props[ tooltipPropName ].dbValues[ 0 ] + '\n';

                if( tooltip.showPropDisplayName ) {
                    verdictObj.tooltip += obj.props[ tooltipPropName ].propertyDescriptor.displayName + ': ';
                }

                verdictObj.tooltip += obj.props[ tooltipPropName ].uiValues[ 0 ] + '\n';
            }
        }
    } else if( indicatorProp.conditions && Object.keys( indicatorProp.conditions ).length === 0 ) {
        //if this has empty condition object, is a default indicator
        if( indicatorProp.names && _.isArray( indicatorProp.names ) && indicatorProp.names.length > 0 ) {
            verdictObj.isDefaultIndicator = true;
            return verdictObj;
        }
    }else if( indicatorProp.type ) {
        var evaluatedVerdictObj = evaluatePropBasedCondition( indicatorProp.type.prop, obj, tooltip );

        //There are missing properties from the tooltip
        if( evaluatedVerdictObj.missingProps.length > 0 ) {
            var foundProps = [];
            //Iterate through the list backward, remove all properties found on this object
            //(Note there may be some properties not found in the src or target obj)
            //(If our goal is to end checking here, we can iterate forward and clear the list)
            for( var propIndx = evaluatedVerdictObj.missingProps.length - 1; propIndx >= 0; propIndx-- ) {
                if( obj.props[evaluatedVerdictObj.missingProps[propIndx]] ) {
                    var propObj = { matchingVal: obj.props[evaluatedVerdictObj.missingProps[propIndx]].dbValues[ 0 ] + '\n',
                                    tooltip: obj.props[evaluatedVerdictObj.missingProps[propIndx]].uiValues[ 0 ] + '\n',
                                    propertyDisplayName: obj.props[evaluatedVerdictObj.missingProps[propIndx]].propertyDescriptor.displayName };
                    foundProps.unshift( propObj );

                    //Current object found this property, so we can remove it from the list.
                    evaluatedVerdictObj.missingProps.splice( propIndx, 1 );
                }
            }
            //Iterate through the list to add to the tooltip the found properties.
            for( var idx = 0; idx < foundProps.length; idx++ ) {
                evaluatedVerdictObj.matchingVal += foundProps[idx].matchingVal;

                if( tooltip.showPropDisplayName ) {
                    evaluatedVerdictObj.tooltip += foundProps[idx].propertyDisplayName + ': ';
                }

                evaluatedVerdictObj.tooltip += foundProps[idx].tooltip;
            }
        }


        return evaluatedVerdictObj;
    }
    return verdictObj;
};


/**
 * Returns the list of visual indicators.
 *
 * @param {vmo} vmo - viewModelObject.
 * @param {getModelObjCallBack} getModelObjCallBack - call back.
 * @return {Array} List of visual indicator objects
 */
export let getVisualIndicators = function( vmo, getModelObjCallBack ) {
    var indicatorsArray = [];
    if( vmo && vmo.props ) {
        let preVerdictArray = [];
        //Go through all the props from VMO, get indicators for each matched prop
        for( const [ propKey, propValue ] of Object.entries( vmo.props ) ) {
            let preVerdict = {};
            if( !_.isEmpty( propValue.dbValue ) || !_.isEmpty( propValue.dbValues ) ) {
                preVerdict.name = propKey;
                preVerdict.vmoProp = propValue;
                let matchedIndicators = Object.values( _indicators ).filter( indicatorJson => indicatorJson && _isValidPropName( indicatorJson.prop, propKey ) );
                //each prop may have multiple indicator
                if( !_.isEmpty( matchedIndicators ) ) {
                    preVerdict.indicators = matchedIndicators;
                    preVerdictArray.push( preVerdict );
                }
            }
        }
        indicatorsArray = _getIndicatorsFromPreVerdict( preVerdictArray, getModelObjCallBack );
        //get the indicators which not defined in indicator.prop, eg. CheckOut
        Object.values( _indicators ).forEach( indicatorJson => {
            if( indicatorJson && !indicatorJson.prop ) {
                var modelTypes = indicatorJson.modelTypes;
                var conditions = indicatorJson.conditions;
                if( _isValidModelType( vmo.modelType, modelTypes ) ) {
                    let isValid = true;
                    if( conditions ) {
                        isValid = expressionParserUtils.evaluateConditions( conditions, vmo );
                    }
                    if( isValid ) {
                        const indicator = exports.generateIndicator( vmo, indicatorJson );
                        if( indicator && !_.isEqual( indicator.tooltip, '' ) ) {
                            indicatorsArray.push( indicator );
                        }
                    }
                }
            }
        } );
    }
    return indicatorsArray;
};

/**
 * Gets the default indicator for a property
 *
 * @return {Object} Indicator object which is default for a given prop
 */
export let getDefaultIndicator = function( propName, obj ) {
    var defaultIndicator = null;
    _.forEach( _indicators, function( indicatorJson ) {
        if( indicatorJson ) {
            var prop = indicatorJson.prop;
            if( prop && prop.names && _.isArray( prop.names ) && prop.names.length > 0 ) {
                // If prop is defined correctly, see if it is valid to default for input propName
                if( prop.names.indexOf( propName ) >= 0 && prop.conditions && _.isEmpty( prop.conditions ) ) {
                    defaultIndicator = indicatorJson;
                    return false;
                }
            }
        }
    } );
    return defaultIndicator;
};

/**
 * Generates indicator object if tooltips are available for given view model object
 *
 * @return {Object} Indicator object which contains tooltip and icon
 */
export let generateIndicator = function( vmo, indicatorJson ) {
    var indicator;

    if( vmo && indicatorJson && indicatorJson.tooltip ) {
        var indicatorProps = indicatorJson.tooltip.propNames;

        if( _.isArray( indicatorProps ) ) {
            var finalTooltip = '';

            for( var indx = 0; indx < indicatorProps.length; indx++ ) {
                var tooltip = '';
                var propValues = [];

                var indicatorProp = indicatorProps[ indx ];

                if( indicatorProp && vmo.props.hasOwnProperty( indicatorProp ) ) {
                    var vmProp = vmo.props[ indicatorProp ];

                    if( vmProp ) {
                        propValues = vmProp.displayValues;
                    }

                    if( propValues && propValues.length > 0 ) {
                        for( var i = 0; i < propValues.length; i++ ) {
                            var propValue = propValues[ i ];

                            if( propValue && propValue !== ' ' ) {
                                if( tooltip === '' && indicatorJson.tooltip.showPropDisplayName ) {
                                    tooltip = vmProp.propertyDisplayName + ': ';
                                }

                                if( i !== propValues.length - 1 ) {
                                    tooltip += propValue + '\n';
                                } else {
                                    tooltip += propValue;
                                }
                            }
                        }

                        if( finalTooltip === '' ) {
                            finalTooltip = tooltip;
                        } else {
                            finalTooltip = finalTooltip + '\n' + tooltip;
                        }
                    }
                }
            }

            var indicatorType = indicatorJson.iconName;

            let sce = AwSceService.instance;

            var icon = sce.trustAsHtml( iconSvc.getIndicatorIcon( indicatorType ) );

            if( !icon ) {
                // Show the missing image indicator if not found.
                icon = sce.trustAsHtml( iconSvc.getTypeIcon( 'MissingImage' ) );
            }

            indicator = {
                tooltip: finalTooltip,
                // Sanitize the command icon
                image: icon
            };
        }
    }

    return indicator;
};


/**
 * API to get indicator based on parameters
 *
 * @param {Object} indicator
 */
export let getIndicatorFromParams = function( indicatorJson, tooltip ) {
    var indicatorFile = null;
    if( indicatorJson !== null ) {
        indicatorFile = indicatorJson.iconName;
    }

    let sce = AwSceService.instance;

    var icon = sce.trustAsHtml( iconSvc.getIndicatorIcon( indicatorFile ) );
    if( !icon || indicatorFile === null ) {
        // Show the missing image indicator if not found.
        icon = sce.trustAsHtml( iconSvc.getTypeIcon( 'MissingImage' ) );
    }
    return {
        tooltip: tooltip,
        // Sanitize the command icon
        image: icon
    };
};
/**
 * API to get indicator based on parameters
 *
 * @param {indicatorJson} indicatorJson - json
 * @returns {Array} returns a list of visual indicators
 */
export let getIndicatorFromJSON = function( indicatorJson ) {
    var indicatorsArray = [];
    var indicatorFile = null;
    var tooltip = null;
    _.forEach( indicatorJson, function( indicator ) {
        if( indicator ) {
            indicatorFile = indicator.image;
            tooltip = indicator.tooltip;
        }

        let sce = AwSceService.instance;

        var icon = sce.trustAsHtml( iconSvc.getIndicatorIcon( indicatorFile ) );
        if( !icon || !indicatorFile ) {
            icon = sce.trustAsHtml( iconSvc.getTypeIcon( 'MissingImage' ) );
        }
        var indicatorObj = {
            image: icon,
            tooltip: tooltip
        };
        indicatorsArray.push( indicatorObj );
    } );
    return indicatorsArray;
};

/**
 * API to override generated indicators for testing only.
 *
 * @param {Object} indicatorsOverride
 */
export let setIndicators = function( indicatorsOverride ) {
    _indicators = indicatorsOverride;
};

exports = {
    getVisualIndicators,
    getDefaultIndicator,
    generateIndicator,
    evaluatePropBasedCondition,
    getIndicatorFromParams,
    getIndicatorFromJSON,
    setIndicators
};
export default exports;
/**
 * This service returns visual indicators.
 *
 * @memberof NgServices
 * @member visualIndicatorService
 */
app.factory( 'visualIndicatorService', () => exports );
