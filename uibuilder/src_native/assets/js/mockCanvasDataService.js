// Copyright (c) 2020 Siemens

/**
 * @module js/mockCanvasDataService
 */
import app from 'app';

var exports = {};

export let getlocalizedPropLabels = function() {
    return {
        displayName: 'Label name',
        buttonDisplayName: 'Label',
        isRequired: 'Required',
        isEditable: 'Is Editable',
        dispValue: 'Value',
        labelPosition: 'Label Position',
        validationCriteria: 'Validation Criteria',
        hasLov: 'Has LOV',
        height: 'Height',
        width: 'Width',
        justify: 'Justify',
        offset: 'Offset',
        color: 'Color',
        anchor: 'Anchor',
        name: 'Name',
        prop: 'Prop',
        invalidPropertyValue: 'The property value should start with alphabets and underscore followed by alphanumeric and underscore',
        frozenColumnIndex: 'Forzen Column Index'
    };
};

export let getCtx = function( param ) {
    var data = {
        'wysiwyg.propPanel.configurations': {
            widgetattrdef: {
                cmdPanelProps: {
                    name: 'props',
                    type: 'string',
                    hasVMBinding: 'false',
                    properties: [ {
                            name: 'caption',
                            type: 'string',
                            refVMLookup: 'i18n',
                            isViewProperty: 'true',
                            isI18nSupported: 'true'
                        },
                        {
                            name: 'hideTitle',
                            type: 'string',
                            isViewProperty: 'true'
                        },
                        {
                            name: 'commands',
                            type: 'string',
                            isViewProperty: 'true'
                        },
                        {
                            name: 'anchor',
                            type: 'string',
                            isViewProperty: 'true'
                        }
                    ]
                },
                awColProps: {
                    name: 'props',
                    type: 'string',
                    hasVMBinding: 'false',
                    properties: [ {
                            name: 'width',
                            type: 'string',
                            isViewProperty: 'true'
                        },
                        {
                            name: 'justify',
                            type: 'string',
                            isViewProperty: 'true'
                        },
                        {
                            name: 'offset',
                            type: 'string',
                            isViewProperty: 'true'
                        },
                        {
                            name: 'color',
                            type: 'string',
                            isViewProperty: 'true'
                        }
                    ]
                },
                lovprop: {
                    name: 'prop',
                    displayValue: '{{i18n.prop}}',
                    type: 'string',
                    refVMLookup: 'data',
                    attrValuePrefix: 'data',
                    hasVMBinding: 'true',
                    renderingHint: 'radio',
                    isViewProperty: 'true',
                    properties: [ {
                            name: 'displayName',
                            displayValue: '{{i18n.displayName}}',
                            type: 'string',
                            required: true,
                            isI18nSupported: 'true'
                        },
                        {
                            name: 'isRequired',
                            type: 'boolean'
                        },
                        {
                            name: 'dispValue',
                            type: 'string'
                        },
                        {
                            name: 'hasLov',
                            type: 'boolean',
                            renderingHint: 'radio',
                            defaultValues: [ {
                                    propInternalValue: 'false',
                                    propDisplayValue: 'False'
                                },
                                {
                                    propInternalValue: 'true',
                                    propDisplayValue: 'True'
                                }
                            ]
                        },
                        {
                            name: 'dataprovider',
                            type: 'string'
                        }
                    ]
                },
                buttonProperties: {
                    name: 'prop',
                    type: 'string',
                    hasVMBinding: 'false',
                    properties: [ {
                            name: 'buttonDisplayName',
                            type: 'string',
                            isI18nSupported: 'true'
                        },
                        {
                            name: 'buttonType',
                            type: 'string',
                            isViewProperty: 'true'
                        },
                        {
                            name: 'size',
                            type: 'string',
                            isViewProperty: 'true'
                        }
                    ]
                },
                wysTableGrid: {
                    refVMLookup: 'grids',
                    name: 'gridid',
                    type: 'string',
                    hasVMBinding: 'true',
                    isViewProperty: 'true',
                    properties: [ {
                            name: 'gridOptions',
                            type: 'object',
                            hasVMBinding: 'false',
                            isViewProperty: 'false',
                            properties: [ {
                                    name: 'enablePinning',
                                    type: 'boolean',
                                    renderingHint: 'checkbox'
                                },
                                {
                                    name: 'enableSorting',
                                    type: 'boolean',
                                    renderingHint: 'checkbox'
                                },
                                {
                                    name: 'isFilteringEnabled',
                                    type: 'boolean',
                                    renderingHint: 'checkbox'
                                },
                                {
                                    name: 'enableGridMenu',
                                    type: 'object',
                                    hasVMBinding: 'false',
                                    isViewProperty: 'false',
                                    properties: [ {
                                            name: 'horizontalEnable',
                                            type: 'boolean',
                                            renderingHint: 'checkbox'
                                        },
                                        {
                                            name: 'verticalEnable',
                                            type: 'boolean',
                                            renderingHint: 'checkbox'
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            name: 'columnProvider',
                            type: 'typeRef',
                            refVMLookup: 'mock.columnProviders',
                            properties: [ {
                                    name: 'frozenColumnIndex',
                                    displayValue: '{{i18n.frozenColumnIndex}}',
                                    type: 'string',
                                    renderingHint: 'textbox'
                                },
                                {
                                    name: 'gridOptions',
                                    type: 'object',
                                    hasVMBinding: 'false',
                                    isViewProperty: 'false',
                                    properties: [ {
                                        name: 'enablePinning',
                                        type: 'boolean',
                                        renderingHint: 'checkbox'
                                    } ]
                                }
                            ]
                        }
                    ]
                },
                toggleprop: {
                    name: 'prop',
                    displayValue: '{{i18n.prop}}',
                    type: 'string',
                    refVMLookup: 'data',
                    attrValuePrefix: 'data',
                    hasVMBinding: 'true',
                    renderingHint: 'radio',
                    isViewProperty: 'true',
                    validationCriteria: '^[a-zA-Z_]+[a-zA-Z0-9_]*$',
                    properties: [ {
                            name: 'displayName',
                            displayValue: '{{i18n.displayName}}',
                            type: 'string',
                            required: true
                        },
                        {
                            name: 'isRequired',
                            type: 'boolean'
                        }
                    ]
                }
            },
            inputProperties: {
                'aw-command-panel': [ 'cmdPanelProps' ],
                'aw-flex-column': [ 'awColProps' ],
                'aw-textbox': [ 'lovprop' ],
                'aw-button': [ 'buttonProperties' ],
                'aw-splm-table': [ 'wysTableGrid' ],
                'aw-togglebutton': [ 'toggleprop' ]
            }
        },
        'wysiwyg.canvas.configurations': {
            layoutElements: [ 'wys-canvas-container', 'aw-command-panel', 'aw-flex-row', 'aw-flex-column', 'aw-command-panel-section' ],
            containerElementsAsWidget: [ 'aw-command-panel-section' ],
            additionalSupportedElements: [ 'aw-i18n' ],
            nestedViewElements: [ {
                    name: 'aw-include',
                    attr: 'name'
                },
                {
                    name: 'aw-command-sub-panel',
                    attr: 'panel-id'
                },
                {
                    name: 'aw-tab-set',
                    attr: 'tabs',
                    resolve: {
                        type: 'array',
                        attr: 'panelId'
                    }
                }
            ]
        },
        'wysiwyg.state': {
            current: {
                name: 'wysiwygCanvas'
            }
        },
        'wysiwyg.configurations': {
            mockDataProperties: [ 'dataprovider', 'columnprovider', 'gridid' ],
            referenceProperties: {
                gridid: [ 'dataProvider', 'columnProvider' ]
            },
            mockDataElements: [ 'aw-splm-table', 'aw-list', 'aw-list-filter', 'aw-chip-list' ],
            attrConfigurations: {
                caption: {
                    refVMLookup: 'i18n',
                    definition: 'i18n'
                },

                dataprovider: {
                    refVMLookup: 'dataProviders',
                    definition: 'data.dataProviders'
                },
                columnprovider: {
                    refVMLookup: 'columnProviders',
                    definition: ''
                },

                action: {
                    refVMLookup: 'actions',
                    definition: ''
                },
                prop: {
                    refVMLookup: 'data',
                    definition: 'data'
                },
                source: {
                    refVMLookup: 'data',
                    definition: 'data'
                },
                name: {
                    refVMLookup: 'data',
                    definition: 'data'
                },
                gridid: {
                    refVMLookup: 'grids',
                    definition: ''
                }
            }
        },
        'wysiwyg.contributions': {
            'aw-splm-table': {
                dataProviders: {
                    wysTableDataProvider: {
                        dataProviderType: 'Static',
                        response: [ {
                                type: 'wysSplmTable',
                                uid: 0,
                                props: {
                                    Name: {
                                        type: 'STRING',
                                        hasLov: false,
                                        isArray: false,
                                        displayValue: 'Name1',
                                        uiValue: 'Name1',
                                        value: 'Name1',
                                        propertyName: 'Name',
                                        propertyDisplayName: 'Name',
                                        isEnabled: true
                                    },
                                    Description: {
                                        type: 'STRING',
                                        hasLov: false,
                                        isArray: false,
                                        displayValue: 'Description1',
                                        uiValue: 'Description1',
                                        value: 'Description1',
                                        propertyName: 'Description',
                                        propertyDisplayName: 'Description',
                                        isEnabled: true
                                    }
                                }
                            },
                            {
                                type: 'wysSplmTable',
                                uid: 1,
                                props: {
                                    Name: {
                                        type: 'STRING',
                                        hasLov: false,
                                        isArray: false,
                                        displayValue: 'Name2',
                                        uiValue: 'Name2',
                                        value: 'Name2',
                                        propertyName: 'Name',
                                        propertyDisplayName: 'Name',
                                        isEnabled: true
                                    },
                                    Description: {
                                        type: 'STRING',
                                        hasLov: false,
                                        isArray: false,
                                        displayValue: 'Description2',
                                        uiValue: 'Description2',
                                        value: 'Description2',
                                        propertyName: 'Description',
                                        propertyDisplayName: 'Description',
                                        isEnabled: true
                                    }
                                }
                            },
                            {
                                type: 'wysSplmTable',
                                uid: 2,
                                props: {
                                    Name: {
                                        type: 'STRING',
                                        hasLov: false,
                                        isArray: false,
                                        displayValue: 'Name3',
                                        uiValue: 'Name3',
                                        value: 'Name3',
                                        propertyName: 'Name',
                                        propertyDisplayName: 'Name',
                                        isEnabled: true
                                    },
                                    Description: {
                                        type: 'STRING',
                                        hasLov: false,
                                        isArray: false,
                                        displayValue: 'Description3',
                                        uiValue: 'Description3',
                                        value: 'Description3',
                                        propertyName: 'Description',
                                        propertyDisplayName: 'Description',
                                        isEnabled: true
                                    }
                                }
                            }
                        ],
                        totalFound: 3
                    }
                },
                columnProviders: {
                    wysTableColumnProvider: {
                        frozenColumnIndex: 0,
                        columns: [ {
                                name: 'Name',
                                displayName: 'Name',
                                minWidth: 60,
                                width: 250,
                                enableColumnMenu: false,
                                pinnedLeft: true
                            },
                            {
                                name: 'Description',
                                displayName: 'Description',
                                maxWidth: 300,
                                minWidth: 80,
                                width: 250,
                                enableColumnMenu: false
                            }
                        ]
                    }
                },
                mock: {
                    dataProviders: {
                        wysTableDataProvider: {
                            dataProviderType: 'Static',
                            response: [ {
                                    type: 'wysSplmTable',
                                    uid: 0,
                                    props: {
                                        Name: {
                                            type: 'STRING',
                                            hasLov: false,
                                            isArray: false,
                                            displayValue: 'Name1',
                                            uiValue: 'Name1',
                                            value: 'Name1',
                                            propertyName: 'Name',
                                            propertyDisplayName: 'Name',
                                            isEnabled: true
                                        },
                                        Description: {
                                            type: 'STRING',
                                            hasLov: false,
                                            isArray: false,
                                            displayValue: 'Description1',
                                            uiValue: 'Description1',
                                            value: 'Description1',
                                            propertyName: 'Description',
                                            propertyDisplayName: 'Description',
                                            isEnabled: true
                                        }
                                    }
                                },
                                {
                                    type: 'wysSplmTable',
                                    uid: 1,
                                    props: {
                                        Name: {
                                            type: 'STRING',
                                            hasLov: false,
                                            isArray: false,
                                            displayValue: 'Name2',
                                            uiValue: 'Name2',
                                            value: 'Name2',
                                            propertyName: 'Name',
                                            propertyDisplayName: 'Name',
                                            isEnabled: true
                                        },
                                        Description: {
                                            type: 'STRING',
                                            hasLov: false,
                                            isArray: false,
                                            displayValue: 'Description2',
                                            uiValue: 'Description2',
                                            value: 'Description2',
                                            propertyName: 'Description',
                                            propertyDisplayName: 'Description',
                                            isEnabled: true
                                        }
                                    }
                                },
                                {
                                    type: 'wysSplmTable',
                                    uid: 2,
                                    props: {
                                        Name: {
                                            type: 'STRING',
                                            hasLov: false,
                                            isArray: false,
                                            displayValue: 'Name3',
                                            uiValue: 'Name3',
                                            value: 'Name3',
                                            propertyName: 'Name',
                                            propertyDisplayName: 'Name',
                                            isEnabled: true
                                        },
                                        Description: {
                                            type: 'STRING',
                                            hasLov: false,
                                            isArray: false,
                                            displayValue: 'Description3',
                                            uiValue: 'Description3',
                                            value: 'Description3',
                                            propertyName: 'Description',
                                            propertyDisplayName: 'Description',
                                            isEnabled: true
                                        }
                                    }
                                }
                            ],
                            totalFound: 3
                        }
                    },
                    columnProviders: {
                        wysTableColumnProvider: {
                            frozenColumnIndex: 0,
                            columns: [ {
                                    name: 'Name',
                                    displayName: 'Name',
                                    minWidth: 60,
                                    width: 250,
                                    enableColumnMenu: false,
                                    pinnedLeft: true
                                },
                                {
                                    name: 'Description',
                                    displayName: 'Description',
                                    maxWidth: 300,
                                    minWidth: 80,
                                    width: 250,
                                    enableColumnMenu: false
                                }
                            ]
                        }
                    }
                },
                grids: {
                    wysTable: {
                        dataProvider: 'wysTableDataProvider',
                        columnProvider: 'wysTableColumnProvider',
                        addIconColumn: false,
                        gridOptions: {
                            enablePinning: false,
                            enableSorting: false,
                            isFilteringEnabled: false,
                            enableGridMenu: false
                        }
                    }
                }
            },
            'aw-list': {
                dataProviders: {
                    wysListDataProvider: {
                        dataProviderType: 'Static',
                        response: [ {
                                cellHeader1: 'Header_1',
                                isTitleClickable: false,
                                source: 'list',
                                cellProperties: [ {
                                    key: 'propKey_1',
                                    value: 'propValue_1'
                                } ],
                                hasThumbnail: false
                            },
                            {
                                cellHeader1: 'Header_2',
                                isTitleClickable: false,
                                source: 'list',
                                cellProperties: [ {
                                    key: 'propKey_1',
                                    value: 'propValue_1'
                                } ],
                                hasThumbnail: false
                            },
                            {
                                cellHeader1: 'Header_3',
                                isTitleClickable: false,
                                source: 'list',
                                cellProperties: [ {
                                    key: 'propKey_1',
                                    value: 'propValue_1'
                                } ],
                                hasThumbnail: false
                            }

                        ],
                        totalFound: 3
                    }
                },
                mock: {
                    dataProviders: {
                        wysListDataProvider: {
                            dataProviderType: 'Static',
                            response: [ {
                                    cellHeader1: 'Mocked_Header_1',
                                    isTitleClickable: false,
                                    source: 'list',
                                    cellProperties: [ {
                                        key: 'mockedPropKey_1',
                                        value: 'mockedPropValue_1'
                                    } ],
                                    hasThumbnail: false
                                },
                                {
                                    cellHeader1: 'Mocked_Header_2',
                                    isTitleClickable: false,
                                    source: 'list',
                                    cellProperties: [ {
                                        key: 'mockedPropKey_1',
                                        value: 'mockedPropValue_1'
                                    } ],
                                    hasThumbnail: false
                                },
                                {
                                    cellHeader1: 'Mocked_Header_3',
                                    isTitleClickable: false,
                                    source: 'list',
                                    cellProperties: [ {
                                        key: 'mockedPropKey_1',
                                        value: 'mockedPropValue_1'
                                    } ],
                                    hasThumbnail: false
                                }

                            ],
                            totalFound: 3
                        }
                    }
                },
                actions: {
                    reveal: {
                        actionType: 'dataProvider',
                        method: 'wysListDataProvider'
                    }
                }
            }
        }
    };

    return data[ param ];
};

export let getRandomInt = function() {
    var max = 10000;
    return Math.floor( Math.random() * Math.floor( max ) );
};

export let createDocModel = function( tagName, className, parent ) {
    var tag = document.createElement( tagName );
    var attId = document.createAttribute( 'id' );
    attId.value = 'wys-' + exports.getRandomInt();
    tag.setAttributeNode( attId );

    if( className ) {
        var attClass = document.createAttribute( 'class' );
        attClass.value = className;
        tag.setAttributeNode( attClass );
    }

    if( parent ) {
        parent.appendChild( tag );
    }

    return tag;
};

export let setAttribute = function( tag, attrNAme, attrValue ) {
    var attr = document.createAttribute( attrNAme );
    attr.value = attrValue;
    tag.setAttributeNode( attr );
};

export let getCanvasData = function( widgetName ) {
    var root = exports.createDocModel( 'wys-canvas-container' );
    var column = exports.createDocModel( 'aw-flex-column', 'wys-canvas-layoutTemplate', root );
    var wysWidgetWrapper = exports.createDocModel( 'wys-widget-wrapper', null, column );
    exports.createDocModel( widgetName, null, wysWidgetWrapper );

    return {
        canvasModel: root
    };
};

exports = {
    getlocalizedPropLabels,
    getCtx,
    getRandomInt,
    createDocModel,
    setAttribute,
    getCanvasData
};
export default exports;
app.factory( 'mockCanvasDataService', () => exports );
