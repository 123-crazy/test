/*global
 CKEDITOR
 */
CKEDITOR.plugins
    .add(
        'requirementWidget', {
            requires: 'widget,rmMenuPanel',

            init: function( editor ) {

                editor.widgets
                    .add(
                        'requirementWidget', {

                            template: '<div class="requirement">' +
                                '<div class = "aw-requirement-marker">' +
                                '<typeIcon></typeIcon>' +
                                '<checkedOut></checkedOut>' +
                                '<tracelinkIcon></tracelinkIcon>' +
                                '<addElementIcon></addElementIcon>' +
                                '</div>' +
                                '<div class = "aw-requirement-sideContent">' +
                                '<div class = "aw-requirement-header">' +
                                '<h3 data-placeholder="Title">Title</h3>' +
                                '</div>' +
                                '<div class="aw-requirement-content" data-placeholder="Content">Content</div>' +
                                '</div>',

                            editables: {
                                marker: {
                                    selector: '.aw-requirement-marker'
                                },
                                title: {
                                    selector: '.aw-requirement-header'
                                },
                                content: {
                                    selector: '.aw-requirement-content'
                                }
                            },
                            allowedContent: 'div[*]{*}(!requirement);div[*]{*}(!aw-requirement-marker);div[*]{*}(!aw-requirement-header);div[*]{*}(!aw-requirement-content)',

                            requiredContent: 'div(requirement)',

                            draggable: false,

                            previousTitle: null,

                            previousTitleText: null,

                            objectTypesWithIcon: null,

                            isValidObjectToSave: true,

                            isWidgetSelected: false,

                            upcast: function( element ) {
                                return element.name === 'div' &&
                                    element
                                    .hasClass( 'requirement' );
                            },

                            getData: function() {
                                return this.editables.content
                                    .getData();
                            },

                            getHeaderData: function() {
                                if( this.editables.title.$ )
                                    return this.editables.title.$.innerHTML;
                                else
                                    this.editables.title.innerHTML;
                            },

                            getHeaderDataWithoutClass: function() {
                                if( this.editables.title.$ ) {
                                    if( this.editables.title.$.getElementsByClassName( "aw-requirement-properties" ).length > 0 ) {
                                        var element = this.editables.title.$.getElementsByClassName( "aw-requirement-properties" )[ 0 ];
                                        element.classList.remove( "cke_widget_editable_focused" );
                                    }
                                    return this.editables.title.$.innerHTML;
                                } else
                                    this.editables.title.innerHTML;
                            },

                            getTitle: function() {
                                return this.editables.title.$.querySelector( 'label' ) ? this.editables.title.$.querySelector( 'label' ).innerText.trim() : this.editables.title.getText().trim();
                            },

                            setTitle: function( title ) {
                                this.editables.title.$
                                    .getElementsByTagName( "h3" )[ 0 ].innerHTML = title;
                            },

                            setTitleText: function( titleText ) {
                                this.editables.title.$
                                    .getElementsByClassName( 'aw-requirement-title' )[ 0 ].innerHTML = titleText;
                            },

                            setBodyText: function( bodyText ) {
                                var bodyTextDiv = this.editables.content.$.getElementsByClassName( 'aw-requirement-bodytext' );
                                bodyTextDiv[ 0 ].innerHTML = bodyText;
                            },

                            resetContents: function() {
                                this.editables.content.setData( objectInitialContentsMap[ this.element.$.id ] );
                                this.editables.title.setData( this.previousTitle );
                            },
                            getOriginalTitleText: function() {
                                var tempEle = document.createElement( 'div' );
                                tempEle.innerHTML = this.previousTitle;
                                var titleElement = tempEle.getElementsByClassName( 'aw-requirement-title' );
                                if( titleElement && titleElement.length > 0 ) {
                                    return titleElement[ 0 ].innerHTML;
                                }
                                return '';
                            },
                            getOriginalBodyText: function() {
                                var origionalData = objectInitialContentsMap[ this.element.$.id ];
                                var tempEle = document.createElement( 'div' );
                                tempEle.innerHTML = origionalData;
                                var bodyText = tempEle.getElementsByClassName( 'aw-requirement-bodytext' );
                                if( bodyText && bodyText.length > 0 ) {
                                    var bodyTextStr = bodyText[ 0 ].innerHTML;
                                    bodyTextStr = bodyTextStr.replace( /(\r\n|\n|\r)/gm, "" );
                                    return bodyTextStr;
                                }
                                return '';
                            },
                            setOriginalTitleText: function( titleText ) {
                                if( this.getOriginalTitleText() !== titleText ) {
                                    var titleElementDiv = this.editables.title.$.getElementsByClassName( 'aw-requirement-title' )[ 0 ];
                                    _setElementContent( titleElementDiv, titleText )
                                    this.syncOriginalHeader();
                                }
                            },
                            setOriginalBodyText: function( bodyText ) {
                                if( this.getOriginalBodyText() !== bodyText ) {
                                    var bodyTextDiv = this.editables.content.$.getElementsByClassName( 'aw-requirement-bodytext' )[ 0 ];
                                    _setElementContent( bodyTextDiv, bodyText )
                                    this.syncOriginalContents();
                                }
                            },
                            syncOriginalContents: function() {
                                objectInitialContentsMap[ this.element.$.id ] = this.editables.content.getData();
                            },

                            syncOriginalHeader: function() {
                                this.previousTitle = this.getHeaderData();
                                this.previousTitleText = this.getTitle();
                            },

                            syncUpdatedPropertiesData: function( updatedProperties ) {

                                var origionalData = objectInitialContentsMap[ this.element.$.id ];
                                var tempEle = document.createElement( 'div' );
                                tempEle.innerHTML = origionalData;
                                var properties = tempEle.getElementsByClassName( 'aw-requirement-properties' );
                                for( var i = 0; i < properties.length; i++ ) {
                                    var property = properties[ i ];
                                    if( property.getAttribute( 'internalname' ) in updatedProperties ) {
                                        property.textContent = updatedProperties[ property.getAttribute( 'internalname' ) ];
                                    }
                                }
                                objectInitialContentsMap[ this.element.$.id ] = tempEle.innerHTML;
                            },

                            getType: function() {
                                return this.element.$
                                    .getAttribute( 'objectType' );
                            },

                            checkDirty: function() {
                                return objectInitialContentsMap[ this.element.$.id ] !== this.editables.content.getData();
                            },

                            updateContents: function(updatedContents) {
                                objectInitialContentsMap[ this.element.$.id ] = this.editables.content.getData();
                            },

                            checkHeaderDirty: function() {
                                // Paragraph numbering changes caused by insertions/deletions are not considered a change so
                                // strip number off start of title before comparison.
                                var head = this.getHeaderData();
                                var oldHead = this.previousTitle;
                                var idx1 = this.previousTitleText.indexOf(' ');
                                var idx2 = this.getTitle().indexOf(' ');
                                idx1 = idx1 === -1 ? 0 : idx1;
                                idx2 = idx2 === -1 ? 0 : idx2;
                                return this.getTitle().substr( idx2 ) !== this.previousTitleText.substr( idx1 );
                            },

                            getCreatedSiblingElements: function() {
                                if( this.createdSiblingElements ) {
                                    // Add position to the created objects
                                    for( var index = 0; index < this.createdSiblingElements.length; index++ ) {
                                        var widget = this.createdSiblingElements[ index ];
                                        widget.element.$.setAttribute( 'position', index + 1 );
                                    }
                                    return this.createdSiblingElements;
                                }
                                return null;
                            },

                            getCreatedChildElements: function() {
                                if( this.createdChildElements ) {
                                    // Add position to the created objects
                                    for( var index = 0; index < this.createdChildElements.length; index++ ) {
                                        var widget = this.createdChildElements[ index ];
                                        widget.element.$.setAttribute( 'position', index + 1 );
                                    }
                                    return this.createdChildElements;
                                }
                                return null;
                            },

                            setType: function( typeName ) {
                                if( this.objectTypesWithIcon ) {
                                    for( var key in this.objectTypesWithIcon ) {
                                        var type = this.objectTypesWithIcon[ key ];
                                        if( type.typeName
                                            .toLowerCase() === typeName
                                            .toLowerCase() ) {
                                            iconURL = type.typeName;
                                            this.element.$.setAttribute( 'objectType', type.typeName );
                                            this.element.$.setAttribute( 'itemType', type.typeName );
                                            break;
                                        }
                                    }
                                } else {
                                    this.element.$.setAttribute( 'objectType', typeName );
                                    this.element.$.setAttribute( 'itemType', typeName );
                                }
                            },

                            setTypeIcon: function( typeName ) {

                                // Replace the place holder with 'Type' icon
                                var typeIconElement = this.element.$.getElementsByTagName( "typeIcon" );
                                if( typeIconElement && typeIconElement.length > 0 ) {

                                    var typeObject = getTypeObject( this.objectTypesWithIcon, typeName );
                                    if( !typeObject ) {
                                        return;
                                    }

                                    var imgElement = document.createElement( 'img' );
                                    imgElement.src = typeObject.typeIconURL;
                                    // Check if type icon is already added, if yes, first remove it before adding new
                                    if( typeIconElement[ 0 ].lastChild ) {
                                        typeIconElement[ 0 ].removeChild( typeIconElement[ 0 ].lastChild );
                                    }
                                    typeIconElement[ 0 ].appendChild( imgElement );

                                    typeIconElement[ 0 ].classList.add( 'aw-ckeditor-marker-element' );
                                    typeIconElement[ 0 ].title = editor.changeTypeTitle;
                                    typeIconElement[ 0 ].addEventListener( "click", changeExistingEleTypeClickHandler );
                                }
                            },

                            setTypeIconMenu: function( element ) {
                                var uid = this.element.$.id;
                                if( uid.indexOf( "RM::NEW::" ) !== 0 ) {
                                    // Replace the place holder with 'Type' icon
                                    var typeIconElement = this.element.$.getElementsByTagName( "typeIcon" );
                                    if( typeIconElement && typeIconElement.length > 0 ) {
                                        typeIconElement[ 0 ].removeEventListener( "contextmenu", contextMenuClickHandler );
                                        typeIconElement[ 0 ].addEventListener( "contextmenu", contextMenuClickHandler );
                                    }
                                }
                            },

                            setAddElementIcon: function() {

                                // Replace the place holder with
                                // 'Add Element'command icon
                                var addIconElement = this.element.$.getElementsByTagName( "addElementIcon" );
                                if( addIconElement && addIconElement.length > 0 ) {

                                    addIconElement[ 0 ].innerHTML = editor.addIconImgElement;
                                    // Class added to identify element through cucumber
                                    addIconElement[ 0 ].classList.add( 'aw-ckeditor-marker-element' );

                                    addIconElement[ 0 ].title = editor.addTitle +
                                        "\n" + editor.addSiblingKeyTitle +
                                        "\n" + editor.addChildKeyTitle;
                                    addIconElement[ 0 ].classList.add( 'aw-ckeditor-linkAction' );

                                    addIconElement[ 0 ].addEventListener( "click", addElementClickHandler );
                                }

                            },

                            setCheckedOutIcon: function() {
                                var checkedOutBy = this.element.$.getAttribute( "checkedOutBy" );
                                var checkedOutIcon = this.element.$.getElementsByTagName( "checkedOut" );

                                while( checkedOutIcon && checkedOutIcon[0] && checkedOutIcon[0].firstChild ) {
                                    checkedOutIcon[0].removeChild( checkedOutIcon[0].firstChild );
                                }

                                if( !checkedOutBy ) {
                                    return;
                                }

                                if( checkedOutIcon && checkedOutIcon.length > 0 ) {
                                    checkedOutIcon[ 0 ].innerHTML = editor.checkoutIconImgElement;
                                    checkedOutIcon[ 0 ].classList.add( 'aw-ckeditor-indicator' );
                                    checkedOutIcon[ 0 ].title = editor.checkedOutByTitle + ': ' + checkedOutBy + '\n' +
                                        editor.checkedOutDateTitle + ': ' + this.element.$.getAttribute( "checkedOutTime" );
                                }

                            },

                            setRemoveElementIcon: function( isAddRemoveButton ) {

                                // Replace the place holder with
                                // 'Add Element'command icon
                                var addIconElement = this.element.$.getElementsByTagName( "removeElementIcon" );

                                var tmpParentId = this.element.$.getAttribute( 'parentId' )

                                if( ( !addIconElement || addIconElement.length <= 0 ) && isAddRemoveButton && tmpParentId !== '' ) {
                                    var markerDiv = getWidgetElementByClassName( this, ".aw-requirement-marker" );
                                    var removeElementPlaceHolder = document.createElement( 'removeElementIcon' );
                                    markerDiv.$.appendChild( removeElementPlaceHolder );
                                    addIconElement = this.element.$.getElementsByTagName( "removeElementIcon" );
                                }
                                if( addIconElement && addIconElement.length > 0 ) {

                                    var iconService = editor.iconSvc;
                                    var imgElement = iconService.getIcon( "cmdRemove" );

                                    addIconElement[ 0 ].innerHTML = imgElement;
                                    // Class added to identify element through cucumber
                                    addIconElement[ 0 ].classList.add( 'aw-ckeditor-marker-element' );

                                    addIconElement[ 0 ].title = editor.removeTitle;
                                    addIconElement[ 0 ].classList.add( 'aw-ckeditor-linkAction' );

                                    addIconElement[ 0 ].addEventListener( "click", removeElementClickHandler );
                                }

                            },
                            setTracelinkIcon: function( elementID, hasTracelink ) {

                                var contentDiv = getWidgetElementByClassName( this, ".aw-requirement-content" );
                                var bodyElement = contentDiv.$.getElementsByClassName( 'aw-requirement-bodytext' )[ 0 ];
                                // Replace the place holder with
                                // 'Create Tracelink'command icon
                                var tracelinkIconElement = this.element.$.getElementsByTagName( "tracelinkIcon" );
                                if( tracelinkIconElement && tracelinkIconElement.length > 0 ) {
                                    // Class added to identify element through cucumber
                                    tracelinkIconElement[ 0 ].classList.add( 'aw-ckeditor-marker-element' );
                                    tracelinkIconElement[ 0 ].style.visibility = "visible";

                                    if( !hasTracelink || hasTracelink !== "TRUE" ) {
                                        tracelinkIconElement[ 0 ].classList.add( 'aw-ckeditor-linkAction' );
                                    }

                                    var uid = this.element.$.id;
                                    tracelinkIconElement[ 0 ].addEventListener( "click",
                                        function( event ) {
                                            var eventBus = editor.eventBus;
                                            var target = ( event.currentTarget ) ? event.currentTarget : event.srcElement;
                                            var eventData = {
                                                "sourceObject": { "uid": uid }
                                            };
                                            eventBus.publish( "requirementDocumentation.addObjectToTracelinkPanel", eventData );

                                        }, uid );

                                    tracelinkIconElement[ 0 ].addEventListener( "mouseover",
                                        function( event ) {

                                            var placeholder = this;
                                            var eventBus = editor.eventBus;
                                            var delay = setTimeout( function() {
                                                // Get element position relative to top window
                                                var rect = placeholder.getBoundingClientRect();
                                                var contentFrameElement = editor.window.$.frameElement;
                                                var iconDimension = {
                                                    "offsetHeight": rect.height,
                                                    "offsetLeft": contentFrameElement.offsetLeft + rect.left,
                                                    "offsetTop": contentFrameElement.offsetTop + rect.top,
                                                    "offsetWidth": rect.width
                                                };

                                                var isBasedon = false;
                                                var isDerived = false;
                                                var masterreqname;
                                                var masterReqUid;
                                                var basedOnMasterReqName;
                                                var basedonmasterreqid;

                                                if( bodyElement.attributes[ "isBasedon" ] ) {
                                                    isBasedon = bodyElement.attributes[ "isBasedon" ].nodeValue;
                                                }
                                                if( bodyElement.attributes[ "isderived" ] ) {
                                                    isDerived = bodyElement.attributes[ "isDerived" ].nodeValue;
                                                }
                                                if( bodyElement.attributes[ "masterreqname" ] ) {
                                                    masterreqname = bodyElement.attributes[ "masterreqname" ].nodeValue;
                                                }
                                                if( bodyElement.attributes[ "masterReqUid" ] ) {
                                                    masterReqUid = bodyElement.attributes[ "masterReqUid" ].nodeValue;
                                                }
                                                if( bodyElement.attributes[ "basedOnMasterReqName" ] ) {
                                                    basedOnMasterReqName = bodyElement.attributes[ "basedOnMasterReqName" ].nodeValue;
                                                }
                                                if( bodyElement.attributes[ "basedonmasterreqid" ] ) {
                                                    basedonmasterreqid = bodyElement.attributes[ "basedonmasterreqid" ].nodeValue;
                                                }

                                                var eventData = {
                                                    "sourceObject": {
                                                        "uid": uid,
                                                        "isBasedon": isBasedon,
                                                        "masterReqName": masterreqname,
                                                        "masterReqUid": masterReqUid,
                                                        "isderived": isDerived,
                                                        "basedOnMasterReqName": basedOnMasterReqName,
                                                        "basedonmasterreqid":basedonmasterreqid
                                                    },
                                                    "commandDimension": iconDimension
                                                };
                                                eventBus.publish( "requirementDocumentation.setTooltipContentData", eventData );
                                            }, 500 );

                                            placeholder.addEventListener( "mouseout", function( evt ) {
                                                clearTimeout( delay );
                                            } );

                                        }, uid );
                                }

                            },
                            setTOCSettingsIcon: function() {

                                // Replace the place holder with
                                // 'Settings'command icon
                                var addTOCSettingsIconElement = this.element.$.getElementsByTagName( "settingsIcon" );
                                if( addTOCSettingsIconElement && addTOCSettingsIconElement.length > 0 ) {

                                    var iconService = editor.iconSvc;
                                    var imgElement = iconService.getIcon( "cmdSettings" );

                                    addTOCSettingsIconElement[ 0 ].innerHTML = imgElement;
                                    addTOCSettingsIconElement[ 0 ].classList.add( 'aw-requirement-tocsettings' );

                                    addTOCSettingsIconElement[ 0 ].title = editor.tocSettingsCmdTitle;
                                    addTOCSettingsIconElement[ 0 ].classList.add( 'aw-ckeditor-linkAction' );

                                    addTOCSettingsIconElement[ 0 ].addEventListener( "click", tocSettingClickHandler );
                                }
                            }
                        } );

                // Map to store object uids with contents
                var objectInitialContentsMap = {};
                var mapElementUpdatedTypes = {};
                var isAddRemoveButton = false;

                // Handle copy/paste in Title
                editor.on( "beforePaste", function( e ) {
                    var selection = e.editor.getSelection();
                    if( selection ) {
                        var ranges = selection.getRanges();
                        if( ranges && ranges.length > 0 ) {
                            var ranges = selection.getRanges();
                            var startNode = ranges[ 0 ].startContainer;
                            var target = startNode && startNode.$ ? startNode.$ : null;
                            if( startNode && startNode.$ && startNode.$.nodeType === 3 ) {
                                target = startNode.$.parentElement;
                            }
                            if( ( target && target.classList && target.classList.contains( 'aw-requirement-properties' ) ) ||
                                ( target && target.nodeName && target.nodeName.toUpperCase() === 'LABEL' && target.dataset && target.dataset.placeholder && target.dataset.placeholder === 'Title' ) ) {
                                var data = e.data.dataTransfer.getData( 'Text' )
                                if( data ) {
                                    e.editor.insertText( data );
                                    e.cancel();
                                }
                            }
                        }
                    }
                } );

                /**
                 * Get all text nodes contained by an element
                 * @param {Object} element - div element
                 */
                function _getAlltextNodesUnder( element ) {
                    var node, allTxtNodes = [],
                        walk = document.createTreeWalker( element, NodeFilter.SHOW_TEXT, null, false );
                    while( node = walk.nextNode() ) allTxtNodes.push( node );
                    return allTxtNodes;
                }

                /**
                 * SetCursor position within element's text node
                 * @param {Object} element - div element
                 * @param {String} position - cursor postion to be set
                 */
                function _setCursorPosition( element, position ) {

                    var allTxtNodes = _getAlltextNodesUnder( element );
                    var selectedNode = null;

                    var total_length = 0;
                    var offSet = 0;

                    var countNodes = allTxtNodes ? allTxtNodes.length : 0;

                    for( var ii = 0; ii < countNodes; ii++ ) {

                        offSet = position - total_length;

                        if( offSet < allTxtNodes[ ii ].length ) {
                            selectedNode = allTxtNodes[ ii ];
                            break;
                        }

                        total_length += allTxtNodes[ ii ].length;
                    }

                    // If expected cursor postion exceed text length; set cursor at end of last text node
                    if( !selectedNode && countNodes > 0 ) {

                        selectedNode = allTxtNodes[ countNodes - 1 ]
                        offSet = selectedNode.length;
                    }
                    if( selectedNode ) {

                        var doc = editor.document.$;
                        var win = editor.window.$;

                        var range = doc.createRange();
                        range.setStart( selectedNode, offSet );
                        var selection = win.getSelection();

                        range.collapse( true );
                        selection.removeAllRanges();
                        selection.addRange( range );
                    }
                }
                /**
                 * Set Element Content and retain cursor position
                 * @param {Object} elementDiv - div element
                 * @param {String} innerHtml - innerHtml
                 */

                function _setElementContent( elementDiv, innerHtml ) {

                    var startNode, prevCursorPos;
                    var isRetainCursorPosition = false;
                    var range = ( editor.getSelection().getRanges()[ 0 ] );

                    if( elementDiv && range ) {
                        startNode = range.startContainer.$;
                        isRetainCursorPosition = elementDiv.contains( startNode );
                    }

                    if( isRetainCursorPosition ) {
                        var titleStr = elementDiv.innerText;
                        var startNodeValue = startNode.nodeValue;
                        prevCursorPos = titleStr.indexOf( startNodeValue ) + range.startOffset;
                    }

                    elementDiv.innerHTML = innerHtml;

                    if( isRetainCursorPosition ) {
                        _setCursorPosition( elementDiv, prevCursorPos );
                    }
                }

                 /**
                 * Get all text nodes contained by an element
                 * @param {Object} element - div element
                 */
                function _getAlltextNodesUnder( element ) {
                    var node, allTxtNodes = [],
                        walk = document.createTreeWalker( element, NodeFilter.SHOW_TEXT, null, false );
                    while( node = walk.nextNode() ) allTxtNodes.push( node );
                    return allTxtNodes;
                }

                /**
                 * SetCursor position within element's text node
                 * @param {Object} element - div element
                 * @param {String} position - cursor postion to be set
                 */
                function _setCursorPosition( element, position ) {

                    var allTxtNodes = _getAlltextNodesUnder( element );
                    var selectedNode = null;

                    var total_length = 0;
                    var offSet = 0;

                    var countNodes = allTxtNodes ? allTxtNodes.length : 0;

                    for( var ii = 0; ii < countNodes; ii++ ) {

                        offSet = position - total_length;

                        if( offSet < allTxtNodes[ ii ].length ) {
                            selectedNode = allTxtNodes[ ii ];
                            break;
                        }

                        total_length += allTxtNodes[ ii ].length;
                    }

                    // If expected cursor postion exceed text length; set cursor at end of last text node
                    if( !selectedNode && countNodes > 0 ) {

                        selectedNode = allTxtNodes[ countNodes - 1 ]
                        offSet = selectedNode.length;
                    }
                    if( selectedNode ) {

                        var doc = editor.document.$;
                        var win = editor.window.$;

                        var range = doc.createRange();
                        range.setStart( selectedNode, offSet );
                        var selection = win.getSelection();

                        range.collapse( true );
                        selection.removeAllRanges();
                        selection.addRange( range );
                    }
                }
                /**
                 * Set Element Content and retain cursor position
                 * @param {Object} elementDiv - div element
                 * @param {String} innerHtml - innerHtml
                 */

                function _setElementContent( elementDiv, innerHtml ) {

                    var startNode, prevCursorPos;
                    var isRetainCursorPosition = false;
                    var range = ( editor.getSelection().getRanges()[ 0 ] );

                    if( elementDiv && range ) {
                        startNode = range.startContainer.$;
                        isRetainCursorPosition = elementDiv.contains( startNode );
                    }

                    if( isRetainCursorPosition ) {
                        var titleStr = elementDiv.innerText;
                        var startNodeValue = startNode.nodeValue;
                        prevCursorPos = titleStr.indexOf( startNodeValue ) + range.startOffset;
                    }

                    elementDiv.innerHTML = innerHtml;

                    if( isRetainCursorPosition ) {
                        _setCursorPosition( elementDiv, prevCursorPos );
                    }
                }
                /**
                 * Add initial data to map to use it while check dirty for the widget
                 * @param {String} id - object uid
                 * @param {String} content - html contents
                 */
                function _addInitialContentToMap( id, content ) {
                    if( !( id in objectInitialContentsMap ) ) {
                        objectInitialContentsMap[ id ] = content;
                    }
                }

                editor.on( "resetInitialContentMap", function() {
                    if( editor.undoManager.index === -1 ) {
                        objectInitialContentsMap = {};
                    }
                } );

                // Reset map on set data
                editor.on( "setData", function() {
                    objectInitialContentsMap = {};
                } );

                // Remove copy command from context menu
                editor.removeMenuItem( 'copy' );

                //Remove cut command from context menu
                editor.removeMenuItem( 'cut' );

                // Add command to quick create sibling object
                editor.addCommand( 'addSiblingRequirementWidget', {
                    exec: function( editor ) {

                        getNewWidgetMetaData( "SIBLING", function( widgetMetaData ) {
                            _createNewWidget( widgetMetaData );
                        } );
                    }
                } );

                // Add command to quick create child object
                editor.addCommand( 'addChildRequirementWidget', {
                    exec: function( editor ) {
                        getNewWidgetMetaData( "CHILD", function( widgetMetaData ) {
                            _createNewWidget( widgetMetaData );
                        } );
                    }
                } );

                var selectedElement = '';

                // Subscribe an event to handel the object created event.
                _subscribeEventToHandelObjectAddedEvent();

                // Subscribe an event to handel HTML Spec Template related events.
                _subscribeEventToHandelHTMLSpecTemplateEvent();

                editor.widgets
                    .on(
                        'instanceCreated',
                        function( event ) {

                            var curWidget = event.data;
                            var markerElement = curWidget.element.$
                                .getElementsByClassName( 'aw-requirement-header' );
                            if( markerElement &&
                                markerElement.length > 0 ) {

                                markerElement[ 0 ]
                                    .addEventListener(
                                        "keyup",
                                        function( event ) {
                                            var title = curWidget
                                                .getTitle();
                                            title = title
                                                .replace(
                                                    /\n/g,
                                                    "" );
                                            var currentElment = ( event.currentTarget ) ? event.currentTarget : event.srcElement;
                                            if( title.length > 128 ) {
                                                curWidget
                                                    .setTitle( title
                                                        .substring(
                                                            0,
                                                            128 ) );
                                            } else if( title.length === 0 ) {
                                                currentElment.classList
                                                    .add( "aw-ckeditor-propertyError" );
                                                curWidget.isValidObjectToSave = false;
                                            } else {
                                                currentElment.classList
                                                    .remove( "aw-ckeditor-propertyError" );
                                                curWidget.isValidObjectToSave = true;
                                            }
                                        } );
                                markerElement[ 0 ].addEventListener( "click", function( event ) {
                                    event.preventDefault();
                                    var target = ( event.currentTarget ) ? event.currentTarget : event.srcElement;
                                    var eventData = {
                                        targetElement: target,
                                        clickedWithCtrlKey : event.ctrlKey,
                                        clickedWithShiftKey : event.shiftKey
                                    };
                                    var timer = setTimeout( function() {
                                        onClickOnHeader( eventData );
                                    }, 200 );
                                } );
                                //Subscribe to an event to handle selection change
                                _subscribeEventToHandleSelectionChange();

                            }

                            if( curWidget.name === "requirementWidget" ) {
                                curWidget.on( 'ready',
                                    function( evt ) {

                                        var rmreq = getWidgetElementByClassName( this, ".requirement" );

                                        var markerDiv = getWidgetElementByClassName( this, ".aw-requirement-marker" );
                                        if( markerDiv ) {
                                            markerDiv.$.classList.add( "aw-ckeditor-marker" );
                                            makeElementNonEditable( markerDiv );
                                        }

                                        // Don't fetch just first element which matched selector but look for a correct one.
                                        var headerDiv = getWidgetElementByClassName( this, ".aw-requirement-header" );
                                        var contentDiv = getWidgetElementByClassName( this, ".aw-requirement-content" );
                                        var bodyText = getWidgetElementByClassName( this, ".aw-requirement-bodytext" );

                                        var editableDiv = headerDiv.$.getElementsByClassName( "aw-requirement-properties" );
                                        var nonEditableDiv = headerDiv.$.getElementsByClassName( "aw-requirement-headerNonEditable" );

                                        if( editableDiv.length > 0 ) {
                                            if( !bodyText.getAttribute( "isDerived" ) ) {
                                                makeElementEditable( editableDiv[ 0 ] );
                                            }
                                        }
                                        // Dont allow marker to edit
                                        makeElementNonEditable( headerDiv );

                                        curWidget.previousTitle = curWidget.getHeaderData();
                                        curWidget.previousTitleText = curWidget.getTitle();

                                        var isEmptyAttr = contentDiv
                                            .getAttribute( 'isEmpty' );
                                        var contentTypeAttrContent = contentDiv
                                            .getAttribute( 'contentType' );

                                        var id = this.element.$.id;
                                        var headerElement = headerDiv.$.getElementsByTagName( "h3" )[ 0 ];
                                        if( id.indexOf( "RM::NEW::" ) === 0 ) {
                                            makeElementEditable( headerElement );
                                            headerElement.setAttribute( 'contenteditable', false );
                                        }

                                        // Dont't allow contents to edit, if isEmpty (no fulltext) OR contentType attribute is present (contentType
                                        // attribute will be present for Read-only or word requirement)
                                        if( isEmptyAttr ||
                                            contentTypeAttrContent ) {
                                            makeElementNonEditable( contentDiv );
                                        } else //it would be nice to have a way to detect we have associated template mode on or off.
                                        {
                                            //The contentDiv wil be set to not editable but it still needs data-cke-enter-mode data-cke-widget-editable
                                            contentDiv.setAttribute( 'contenteditable', false );
                                            var bodyElement = contentDiv.$.getElementsByClassName( 'aw-requirement-bodytext' )[ 0 ];
                                            makePropertiesElementEditable( bodyElement );

                                            var contentElement = contentDiv.$.getElementsByClassName( 'aw-requirement-properties' );
                                            for( var ii = 0; ii < contentElement.length; ii++ ) {

                                                makePropertiesElementEditable( contentElement[ ii ] );

                                            }
                                        }
                                        // Insert menu to icon
                                        curWidget.setTypeIconMenu( bodyElement );
                                        // Insert 'Add Element' command to widget
                                        curWidget.setAddElementIcon();
                                        curWidget.setCheckedOutIcon();
                                        curWidget.setRemoveElementIcon( isAddRemoveButton );
                                        curWidget.setTOCSettingsIcon();

                                        var hasTracelink = this.element.$.getAttribute( 'hasTracelink' );
                                        if( id && id !== "" ) {
                                            curWidget.setTracelinkIcon( id, hasTracelink )
                                        }
                                        var contentElement = contentDiv.$.getElementsByClassName( 'aw-requirement-properties' );
                                        for( var ii = 0; ii < contentElement.length; ii++ ) {
                                            contentElement[ ii ].addEventListener( 'click', function( evt ) {
                                                selectedElement = this;
                                            }, false );
                                        }
                                        var bodytextElement = contentDiv.$.getElementsByClassName( 'aw-requirement-bodytext' );
                                        if( bodytextElement && bodytextElement.length > 0 ) {
                                            bodytextElement[ 0 ].addEventListener( 'click', function( evt ) {
                                                selectedElement = this;
                                            }, false );
                                        }

                                        if(bodyElement){
                                            var crossRefLinkElements = bodyElement.getElementsByClassName( 'aw-requirement-crossRefLink' )
                                            for( var i = 0; i < crossRefLinkElements.length; i++ ) {
                                                crossRefLinkElements[ i ].addEventListener( 'click', function( evt ) {
                                                    var eventData = {
                                                        crossRefLinkElement: evt.currentTarget,
                                                        id: editor.name
                                                    }
                                                    editor.eventBus.publish( "requirementDocumentation.openCrossRefLinkInNewTab", eventData );
                                                }, i );
                                            }
                                        }
                                        var editable = editor.editable();
                                        editable.attachListener( editor.document, 'keydown', function( evt ) {
                                            captureKeyboard( evt );
                                        }, this );

                                        ( rmreq.$ ).addEventListener( 'keydown', function( evt ) {
                                            var selection = evt.view.getSelection();
                                            var range = selection.getRangeAt( 0 );

                                            if( range !== null ) {
                                                var startNode = range.startContainer;
                                                var endNode = range.endContainer;
                                                var cancelEvent = false;
                                                var pos = startNode.contains ? startNode.contains( endNode ) : undefined;
                                                var ctrlA;
                                                if( evt.ctrlKey ) {
                                                    if( evt.keyCode == 65 || evt.keyCode == 97 ) {
                                                        ctrlA = evt.ctrlKey;
                                                    }
                                                }
                                                if( pos && !ctrlA ) {
                                                    switch( evt.keyCode ) {
                                                        case 8:
                                                            { //BACKSPACE
                                                                if( range.startOffset === 0 && range.endOffset === 0 ) {
                                                                    var ancestor = startNode.parentNode;
                                                                    while( ancestor !== null && ( ancestor.firstChild === startNode || ancestor.firstChild.contains( startNode ) ) ) {
                                                                        var previous = ancestor.previousSibling;
                                                                        if( previous !== null ) {
                                                                            if( ( new CKEDITOR.dom.node( previous ) ).isReadOnly() ) {
                                                                                cancelEvent = true;
                                                                                break;
                                                                            }
                                                                        }
                                                                        ancestor = ancestor.parentNode;
                                                                    }
                                                                }
                                                                break;
                                                            }
                                                        case 46:
                                                            { //DEL
                                                                if( startNode.length && range.startOffset === startNode.length || isNestedEmpty( startNode ) ) {
                                                                    var ancestor = endNode;
                                                                    while( ancestor !== null ) {
                                                                        var next = ancestor.nextSibling;
                                                                        if( next !== null ) {
                                                                            var node = new CKEDITOR.dom.node( next );
                                                                            if( next.childNodes.length !== 0 || next.textContent.length !== 0 ) {
                                                                                cancelEvent = node.isReadOnly();
                                                                                break;
                                                                            }
                                                                        }
                                                                        ancestor = ancestor.parentNode;
                                                                    }
                                                                }
                                                                break;
                                                            }
                                                    }
                                                } else if( ctrlA ) {
                                                    //(ctrl+a) case - to select only the content in bodytext every time
                                                    //removes selection of all properties and showing only the body text selection
                                                    var ancestor = startNode.parentNode;

                                                    if( !ancestor.classList.contains( "aw-requirement-content" ) ) {
                                                        var contentElement = ancestor.getElementsByClassName( 'aw-requirement-content' );
                                                        while( contentElement.length === 0 ) {
                                                            ancestor = ancestor.parentNode;
                                                            contentElement = ancestor.getElementsByClassName( 'aw-requirement-content' );
                                                        }
                                                        startNode = contentElement[ 0 ];
                                                    } else {
                                                        startNode = ancestor;
                                                    }

                                                    if( startNode.classList && startNode.classList.contains( "aw-requirement-content" ) ) {
                                                        var element = startNode.getElementsByClassName( 'aw-requirement-bodytext' )[ 0 ];
                                                        var doc = editor.document.$;
                                                        var win = editor.window.$;
                                                        if( element && win.getSelection ) {
                                                            var range2 = doc.createRange();
                                                            range2.selectNodeContents( element );
                                                            selection = win.getSelection();
                                                            selection.removeAllRanges();
                                                            selection.addRange( range2 );
                                                        }
                                                        cancelEvent = true;
                                                    }
                                                }
                                                if( cancelEvent ) {
                                                    //Cancel the event
                                                    evt.cancelBubble = true;
                                                    evt.returnValue = false;
                                                }
                                            }
                                        } );
                                        _handleCkeditorLOVs( this.element.$ );
                                        if( id.indexOf( "RM::NEW::" ) !== 0 ) {
                                            // add initial data to map to use it while check dirty for the widget
                                            var initialData = curWidget.getData();
                                            _addInitialContentToMap( id, initialData );
                                        }
                                    } );
                            }

                        } );

                /**
                 * Checks whether the nested node is empty
                 */
                function isNestedEmpty( node ) {
                    if( node.textContent.length === 0 ) {
                        return true;
                    }
                    var isEmpty = false;
                    var childs = node.childNodes;
                    if( childs ) {
                        for( var i = 0; i < childs.length; i++ ) {
                            if( childs[ i ].textContent.length !== 0 ) {
                                isEmpty = false;
                            }
                        }
                    }
                    return isEmpty;
                }
                function getSelectedRequirementElements() {
                    var selectedRequirements = [];
                    var selected = editor.document.$.getElementsByClassName('aw-requirement-headerSelected');
                    for( var i = 0; i < selected.length; i++ ) {
                        selectedRequirements.push(selected[i].parentElement);
                    }
                    return selectedRequirements;
                }
                /**
                 * Handles click on requirement widget header
                 */
                function onClickOnHeader( eventData ) {
                    var reqElement = eventData.targetElement.parentElement;
                    var idAceElement = reqElement.getAttribute( "id" );
                    var selectedReqElement = getSelectedRequirementElements();
                    if( idAceElement && idAceElement.indexOf( "RM::NEW::" ) !== 0 ) {
                        var allObjects = [];
                        var unselect = false;
                        var allObjectsUids = [];
                        if( eventData.clickedWithShiftKey ) {  // Multi-Select with Shift
                            selectedReqElement.forEach( function( obj ) {
                                var uid = obj.id;
                                if( idAceElement !== uid ) {
                                    allObjects.push( { uid : uid } );
                                    allObjectsUids.push( uid );
                                } else {
                                    unselect = true;
                                }
                            });
                            if( !unselect ) {
                                var lastSelection = allObjects[allObjects.length - 1];
                                lastSelection = editor.document.$.getElementById( lastSelection.uid );
                                lastSelection = $( lastSelection );
                                var currentSelection = $( reqElement );

                                var intermidiateNodes = [];

                                if( lastSelection.index() !== currentSelection.index() ) {    // If not same object
                                    if( lastSelection.index() < currentSelection.index() ) {
                                        intermidiateNodes = lastSelection.nextUntil( currentSelection );
                                    } else {
                                        intermidiateNodes = currentSelection.nextUntil( lastSelection );
                                    }
                                }
                                for ( let index = 0; index < intermidiateNodes.length; index++ ) {
                                    const node = intermidiateNodes[index];
                                    if( allObjectsUids.indexOf( node.id ) === -1 ) {
                                        allObjects.push( { uid : node.id } );
                                    }
                                }
                            }
                        } else if( eventData.clickedWithCtrlKey ) {  // Multi-Select with ctrl
                            selectedReqElement.forEach( function( obj ) {
                                var uid = obj.id;
                                if( idAceElement !== uid ) {
                                    allObjects.push( { uid : uid } );
                                } else {
                                    unselect = true;
                                }
                            });
                        }

                        if( !unselect ) {
                            allObjects.push( { uid : idAceElement } );
                        }

                        var objectsTobeSelected = {
                            "objectsToSelect": allObjects
                        };
                        var eventBus = editor.eventBus;
                        eventBus.publish( "aceElementsSelectionUpdatedEvent", objectsTobeSelected );

                    }
                }
                /**
                 *  @param {String} uid - object uid
                 */
                function _getWidgetFromUid( uid ) {

                    var widgets = editor.widgets.instances;
                    for( var w in widgets ) {
                        var widget = widgets[ w ];
                        if( widget.element.$.id === uid ) {
                            return widget;
                        }
                    }
                    return null;
                };
                /**
                 * Handles selection changes
                 *
                 * @param {eventdata} eventdata - contains the uid of the selected object
                 */
                function _handleSelectionChange( eventdata ) {

                    var undoManager = editor.undoManager;
                    undoManager.lock( false, true );

                    editor.eventBus.publish( 'requirements.registerCtxForDerivedCommands');
                    var widgetsTobeSelected = [];
                    eventdata.objectUid.forEach( function( uid ) {
                        var widget = _getWidgetFromUid( uid );
                        if(widget) {
                            widgetsTobeSelected.push(widget);
                        }
                    });

                    if( widgetsTobeSelected.length === 0 )
                        return;

                    var widgets_array = editor.widgets.instances;

                    for( var i in widgets_array ) {
                        var instance = widgets_array[ i ];
                        instance.setFocused( false );
                        instance.setSelected( false );
                        instance.isWidgetSelected = false;
                        if( instance.editables.title ) {
                            var title = instance.editables.title.$;
                            if( widgetsTobeSelected.indexOf(instance) > -1 ) {
                                title.classList.remove( "aw-requirement-headerNonEditable" );
                                title.classList.add( "aw-requirement-headerSelected" );
                                instance.isWidgetSelected = true;
                            } else {
                                title.classList.remove( "aw-requirement-headerSelected" );
                                title.classList.add( "aw-requirement-headerNonEditable" );
                            }
                        }
                    }

                    if(widgetsTobeSelected.length === 1) {
                        widgetsTobeSelected[0].setFocused( true );
                        widgetsTobeSelected[0].setSelected( true );
                    }

                    // Fire an event to know widget selection changed
                    editor.eventBus.publish( "requirementDocumentation.objectSelectionChanged" );

                    undoManager.unlock();
                };
                /**
                 * Method to subscribe event to handle HTML Spec template object related event.
                 */
                function _subscribeEventToHandelHTMLSpecTemplateEvent() {
                    // Unsubscribe event first if already subscribed
                    if( CKEDITOR._eventToHandlerHTMLSpecTemplatel ) {
                        editor.eventBus.unsubscribe( CKEDITOR._eventToHandlerHTMLSpecTemplatel );
                        CKEDITOR._eventToHandlerHTMLSpecTemplatel = null;
                    }
                    CKEDITOR._eventToHandlerHTMLSpecTemplatel = editor.eventBus.subscribe( "specHtmlTemplate.addClickEventOnAllObjects", function() {
                        setTimeout( function() {
                            isAddRemoveButton = true;
                            _addClickEventOnAllObjects();
                        }, 100 );
                    } );

                }
                /**
                 * Add event handler to all existing Objects for HTML Spec template
                 */
                function _addClickEventOnAllObjects() {
                    var widgets = editor.widgets.instances;
                    for( var w in widgets ) {

                        var widget = widgets[ w ];
                        var typeIconElement = widget.element.$.getElementsByTagName( "typeIcon" );

                        if( typeIconElement && typeIconElement.length > 0 ) {
                            typeIconElement[ 0 ].classList.add( 'aw-ckeditor-marker-element' );
                            typeIconElement[ 0 ].title = editor.changeTypeTitle;
                            typeIconElement[ 0 ].addEventListener( "click", changeExistingEleTypeClickHandler );
                        }
                    }
                }

                /**
                 * Attach menu list on right click on type element for all elements to perform operations like move up,move down,promote,demote
                 *
                 * @param {MouseEvent} event : Mouse right click event on element type icon
                 */
                function contextMenuClickHandler( event ) {
                    event.preventDefault();

                    var target = ( event.currentTarget ) ? event.currentTarget : event.srcElement;
                    var targetElement = new CKEDITOR.dom.element( target );

                    var element = getNestedEditable( editor.editable(), targetElement );
                    if(element && element.$ && element.$.id){

                        var selectedRequirementObjects = [];
                        var isClickedOnSelectedWidget = false;

                        var selectedRequirements = getSelectedRequirementElements();
                        selectedRequirements.forEach( function( domReq ) {
                            selectedRequirementObjects.push( createSourceObject( domReq ) );
                            if( domReq.id === element.$.id ) {
                                isClickedOnSelectedWidget = true;
                            }
                        } );

                        if( !isClickedOnSelectedWidget ) {  // If clicked on non-selected widget
                            selectedRequirementObjects = [ createSourceObject( element.$ ) ];
                        }




                        var uid = element.$.id;
                        var delay = 200;
                        var placeholder = this;
                        var eventBus = editor.eventBus;
                        // var target = ( event.currentTarget ) ? event.currentTarget : event.srcElement;
                        // var bodyTextElement = element.$.getElementsByClassName( "aw-requirement-bodytext" );
                        // var isDerived = ( bodyTextElement && bodyTextElement[ 0 ].getAttribute( 'isDerived' ) );
                        // var isFrozen = ( bodyTextElement && bodyTextElement[ 0 ].getAttribute( 'isFrozen' ) );
                        // var isOverwrite = ( bodyTextElement && bodyTextElement[ 0 ].getAttribute( 'isOverwrite' ) );
                        // var isMasterChanged = ( bodyTextElement && bodyTextElement[ 0 ].getAttribute( 'isMasterChanged' ) );
                        var prevent = false;
                        var timer = setTimeout( function() {
                            if( !prevent ) {
                                var rect = target.getBoundingClientRect();
                                var contentFrameElement = editor.window.$.frameElement;
                                var iconDimension = {
                                    "offsetHeight": rect.height,
                                    "offsetLeft": contentFrameElement.offsetLeft + rect.left,
                                    "offsetTop": contentFrameElement.offsetTop + rect.top,
                                    "offsetWidth": rect.width
                                };

                                var eventData = {
                                    "sourceObject": selectedRequirementObjects,
                                    "commandDimension": iconDimension
                                };
                                eventBus.publish( "requirementDocumentation.registerCxtForActionsPanel", eventData );
                            }
                        }, 200 );
                    }
                }

                /**
                 * @param {Object} domReq
                 */
                function createSourceObject( domReq ) {
                    var bodyTextElement = domReq.getElementsByClassName( 'aw-requirement-bodytext' );
                    var isDerived = bodyTextElement && bodyTextElement[0].getAttribute( 'isDerived' );
                    var isFrozen = bodyTextElement && bodyTextElement[0].getAttribute( 'isFrozen' );
                    var isOverwrite =  bodyTextElement && bodyTextElement[ 0 ].getAttribute( 'isOverwrite' );
                    var isMasterChanged =  bodyTextElement && bodyTextElement[ 0 ].getAttribute( 'isMasterChanged' );

                    return {
                        uid: domReq.id,
                        isFrozen: isFrozen,
                        isDerived: isDerived,
                        isOverwrite:isOverwrite,
                        isMasterChanged:isMasterChanged
                    };
                }
                /**
                 * Attach type menu list on click of type element for existing elements for HTML Spec template
                 *
                 * @param {MouseEvent} event : Mouse left click event on element type icon
                 */
                function changeExistingEleTypeClickHandler( event ) {
                    var target = ( event.currentTarget ) ? event.currentTarget : event.srcElement;
                    var targetElement = new CKEDITOR.dom.element( target );
                    var nestedWidget = getNestedEditable( editor.editable(), targetElement );
                    if( nestedWidget ) {
                        var selectedWidget = editor.widgets.getByElement( nestedWidget );
                        if( selectedWidget ) {
                            // Create panel definition for menu
                            var panelDef = {};
                            panelDef.title = "";
                            panelDef.width = "auto";
                            panelDef.height = "auto";
                            panelDef.menuList = getTypeMenu(selectedWidget, event);
                            // Create and attach the menu
                            if (panelDef.menuList) {
                                var menuPanel = new CKEDITOR.ui.rmMenuPanel(editor, panelDef);
                                menuPanel.attach(new CKEDITOR.dom.element((event.currentTarget) ? event.currentTarget : event.srcElement));
                            }
                        }
                    }
                }
                /**
                 * Attach type menu list on click of type element for existing elements for HTML Spec template
                 * @param {Object} widget element clicked on
                 * @param {MouseEvent} event : Mouse click event
                 */
                function getTypeMenu( widget, event ) {
                    var parentId = widget.element.getAttribute( 'parentid' );
                    var parentItemType = widget.element.getAttribute( 'parentItemType' );

                    if( !parentItemType || parentItemType === '' ) {
                        parentItemType = widget.element.getAttribute( 'parenttype' );
                    }
                    if( mapElementUpdatedTypes[ parentId ] && parentItemType !== mapElementUpdatedTypes[ parentId ] ) {
                        parentItemType = mapElementUpdatedTypes[ parentId ];
                    }
                    var objectTypesWithIcon = getAllowedTypesFromGlobalTypeMap( parentItemType ) && getAllowedTypesFromGlobalTypeMap( parentItemType ).objectTypesWithIcon;
                    widget.objectTypesWithIcon = objectTypesWithIcon;
                    if( objectTypesWithIcon ) {
                        return getTypeMenuData( widget );
                    } else {
                        var selected = {
                            "type": parentItemType
                        };
                        var eventData = {
                            "selected": selected,
                            "callback": function( response ) {
                                widget.objectTypesWithIcon = response.objectTypesWithIcon;
                                widget.preferedType = response.preferredType;
                                widget.element.setAttribute( 'parentType', parentItemType );
                                changeTypeClickHandler( event );
                            }
                        };
                        var eventBus = editor.eventBus;
                        if( widget.element.getAttribute( "top_line" ) === 'true' ) {
                            eventBus.publish( "ACEXRTHTMLEditor.getReqSpecSubTypes", eventData );
                        } else {
                            eventBus.publish( "ACEXRTHTMLEditor.getDisplayableTypes", eventData );
                        }
                    }
                }

                /**
                 * Set Element content dirty
                 *
                 * @param {String} elementId - element ID
                 */
                function _setElementDirty( elementId ) {
                    if( elementId ) {
                        var widgets = editor.widgets.instances;
                        for( var w in widgets ) {
                            var widget = widgets[ w ];

                            var tmpElementId = widget.element.$.id
                            if( tmpElementId === elementId ) {
                                widget.element.$.setAttribute( "isDirty", true );
                                return;

                            }
                        }
                    }
                }

                /**
                 * Remove children recursively
                 *
                 * @param {Object} mapParentChildElement - map of elements and their all children
                 * @param {String} parentID - id of the element needs to removed along with all its children
                 */
                function _removeChildRecursive( mapParentChildElement, parentID ) {

                    if( mapParentChildElement.hasOwnProperty( parentID ) ) {
                        var arrChildren = [];
                        arrChildren = mapParentChildElement[ parentID ];
                        if( arrChildren && arrChildren.length > 0 ) {
                            for( var i = ( arrChildren.length - 1 ); i >= 0; i-- ) {
                                var widget = arrChildren[ i ];
                                var uid = widget.$.id;
                                _removeChildRecursive( mapParentChildElement, uid );
                                widget.remove();

                            }
                        }

                    }
                    return false;

                }
                /**
                 * Remove All children objects
                 *
                 * @param {String} elementId - id of the element needs to removed along with all its children
                 */
                function _removeAllChildrenObjects( elementId ) {
                    if( elementId ) {
                        var mapParentChildElement = {};
                        var widgets = editor.widgets.instances;
                        for( var w in widgets ) {
                            var widget = widgets[ w ];

                            var parentId = widget.element.$.getAttribute( 'parentId' )

                            var arrChildren = [];
                            if( mapParentChildElement.hasOwnProperty( parentId ) ) {
                                arrChildren = mapParentChildElement[ parentId ];
                            }
                            arrChildren.push( widget.element );
                            mapParentChildElement[ parentId ] = arrChildren;

                        }
                    }
                    if(mapParentChildElement){
                        _removeChildRecursive( mapParentChildElement, elementId );
                    }


                }

                /**
                 * Remove element handler will remove element and elements in its hierarchy
                 *
                 * @param {MouseEvent} event : Click event on remove button
                 */
                function removeElementClickHandler( event ) {
                    var target = ( event.currentTarget ) ? event.currentTarget : event.srcElement;
                    var targetElement = new CKEDITOR.dom.element( target );
                    var nestedWidget = getNestedEditable( editor.editable(), targetElement );
                    if(nestedWidget && nestedWidget.$ && nestedWidget.$.id){
                        var uid = nestedWidget.$.id;
                        var tmpParentId = nestedWidget.$.getAttribute( 'parentId' )
                        _setElementDirty( tmpParentId );
                        _removeAllChildrenObjects( uid );
                        if( nestedWidget ) {
                            nestedWidget.remove();
                        }
                        // fire change event after addition of new widget
                        editor.fire( 'change' );
                    }
                }
                /**
                 * Method to subscribe event to handle object created event.
                 */
                function _subscribeEventToHandelObjectAddedEvent() {
                    // Unsubscribe event first if already subscribed
                    if( CKEDITOR._eventToHandlerObjectCreatedUsingAddPanel ) {
                        editor.eventBus.unsubscribe( CKEDITOR._eventToHandlerObjectCreatedUsingAddPanel );
                        CKEDITOR._eventToHandlerObjectCreatedUsingAddPanel = null;
                    }
                    CKEDITOR._eventToHandlerObjectCreatedUsingAddPanel = editor.eventBus.subscribe( "requirementDocumentation.newElementCreatedUsingAddPanel", function( eventData ) {
                        setTimeout( function() {
                            _addNewlyCreatedObjectDataToEditor( eventData );
                        }, 100 );
                    } );

                }

                /**
                 * Method to subscribe event to handle selection change event.
                 */
                function _subscribeEventToHandleSelectionChange() {
                    // Unsubscribe event first if already subscribed
                    if( CKEDITOR._eventToHandleSelectionChange ) {
                        editor.eventBus.unsubscribe( CKEDITOR._eventToHandleSelectionChange );
                        CKEDITOR._eventToHandleSelectionChange = null;
                    }
                    CKEDITOR._eventToHandleSelectionChange = editor.eventBus.subscribe( "ckeditor.handleSelectionChange", function( eventData ) {
                        _handleSelectionChange( eventData );
                    }, 'ckEditorUtils' );

                }

                /**
                 * Return the widget instance for the given object uid
                 *
                 * @param {String} uid - object uid
                 * @returns {Object} return the widget for the given uid
                 */
                function _getWidgetFromUid( uid ) {
                    var widgets = editor.widgets.instances;
                    for( var w in widgets ) {
                        var widget = widgets[ w ];
                        if( widget.element.$.id === uid ) {
                            return widget;
                        }
                    }
                    return null;
                }

                /**
                 * Create and add new widget element to the editor
                 *
                 * @param {String} eventData - Newly created object's html content data and addOption
                 */
                function _addNewlyCreatedObjectDataToEditor( eventData ) {

                    var htmlContentData = eventData.htmlContent;
                    var selectedObject = eventData.selectedObject;
                    var addOption = eventData.addOption;

                    var widgetDef = editor.widgets.registered[ 'requirementWidget' ];
                    if( widgetDef && widgetDef.template ) {

                        var contentElement = document.createElement( 'div' );
                        contentElement.innerHTML = htmlContentData;
                        var requirementDivElements = contentElement.getElementsByClassName( "requirement" );
                        var sequenceOfFirstCreated = null;
                        var siblingCount = 0;

                        var createdObjectInstanceList = [];
                        var allCreatedElements = new CKEDITOR.dom.element( "div" );

                        for( var ind = 0; ind < requirementDivElements.length; ind++ ) {
                            var requirementDiv = requirementDivElements[ ind ];

                            //var defaults = typeof widgetDef.defaults === 'function' ? widgetDef.defaults() : widgetDef.defaults;
                            var element = CKEDITOR.dom.element.createFromHtml( requirementDiv.outerHTML );

                            // Create wrapper for the element
                            var wrapper = editor.widgets.wrapElement( element, widgetDef.name );
                            var documentFragment = new CKEDITOR.dom.documentFragment( wrapper.getDocument() );
                            documentFragment.append( wrapper );
                            var instance = editor.widgets.initOn( element, widgetDef );
                            var wrapperElement = documentFragment.getFirst();
                            // Add wrapper
                            allCreatedElements.$.appendChild( wrapperElement.$ );
                            createdObjectInstanceList.push( instance );

                            var hdStr = element.$.querySelector( 'h3' ).innerText;
                            var seq = hdStr.split( " ", 1 );
                            if( !sequenceOfFirstCreated ) {
                                sequenceOfFirstCreated = seq[ 0 ];
                                siblingCount++;
                                // there are more created elements
                                if( requirementDivElements.length !== ( ind + 1 ) ) {
                                    continue;
                                }
                            } else {
                                // If child of the first created
                                if( seq[ 0 ].indexOf( sequenceOfFirstCreated ) === 0 ) {
                                    // there are more created elements
                                    if( requirementDivElements.length !== ( ind + 1 ) ) {
                                        continue;
                                    }
                                } else { // current element is the sibling of last created parent element
                                    sequenceOfFirstCreated = seq[ 0 ];
                                    siblingCount++;
                                    // there are more created elements
                                    if( requirementDivElements.length !== ( ind + 1 ) ) {
                                        continue;
                                    }
                                }
                            }

                            var selectedOBjUid = selectedObject.uid;
                            var selectedWidget = _getWidgetFromUid( selectedOBjUid );
                            if( !selectedWidget ) {
                                return;
                            }

                            var parentWrapperElement = new CKEDITOR.dom.element( selectedWidget.element.$.parentNode );
                            var tempString = parentWrapperElement.$.querySelector( 'h3' ).innerText;
                            var sequence = tempString.split( " ", 1 );

                            var tempArrayOfNumber = [];
                            var widgets = editor.widgets.editor;
                            var widgetData = widgets.widgets.instances;
                            var parentIdOfCurrentElement;
                            var innerText;
                            var updatedText;
                            var indexes;
                            var childData;
                            // If added as a child
                            if( addOption === "CHILD" ) {
                                childData = getNextChildSamePGData( widgetData, sequence );
                                if( childData && childData.parentWrapperElement ) {
                                    allCreatedElements.insertAfter( childData.parentWrapperElement );
                                } else {
                                    allCreatedElements.insertAfter( parentWrapperElement );
                                }

                                // Fire ready event for the new widget instances.
                                for( var cIndex in createdObjectInstanceList ) {
                                    var createdInst = createdObjectInstanceList[ cIndex ];
                                    createdInst.ready = true;
                                    createdInst.fire( 'ready' );
                                }

                            } else { // If Clicked on Add Sibling
                                // create array of widgets with their respective para numbers
                                for( var iinstance in widgetData ) {
                                    if( widgetData[ iinstance ].ready ) {
                                        var headerElement = widgetData[ iinstance ].wrapper.$.getElementsByClassName( "aw-requirement-header" );
                                        if( headerElement && headerElement.length > 0 ) {
                                            innerText = headerElement[ 0 ].innerText;
                                            updatedText = innerText.replace( /(\r\n|\n|\r)/gm, "" );
                                            indexes = updatedText.split( " ", 1 );
                                            tempArrayOfNumber.push( { numberString: indexes[ 0 ], iinstanceData: widgetData[ iinstance ].wrapper.$ } );
                                            if( ( sequence.toString().localeCompare( indexes[ 0 ], 'en', { numeric: true } ) ) === 0 ) {
                                                parentIdOfCurrentElement = widgetData[ iinstance ].wrapper.$.firstElementChild.attributes[ 'parentid' ].nodeValue;
                                            }
                                        }
                                    }
                                }

                                tempArrayOfNumber = tempArrayOfNumber.sort( sortAlphaNum );
                                tempArrayOfNumber = cleaner( tempArrayOfNumber );

                                var arrayForLoop = existingSiblingUpdate( tempArrayOfNumber, parentIdOfCurrentElement, sequence );

                                updateChildAsperNewSibling( arrayForLoop, tempArrayOfNumber );

                                var currentChildArray;
                                if( siblingCount > 0 && !( arrayForLoop.length > 0 ) ) {
                                    currentChildArray = _getArrayIndexOfGivenSequenceNumber( tempArrayOfNumber, sequence[ 0 ] );
                                }
                                // If Sibling for the selection is exist
                                if( arrayForLoop.length > 0 ) {
                                    // Get the next sibling of the selected and insert before it
                                    var seqOfNext = arrayForLoop[ 0 ];
                                    var parentWrapperElement1 = new CKEDITOR.dom.element( _getDataForGivenIndexNumber( tempArrayOfNumber, seqOfNext[ 0 ] ).iinstanceData );
                                    allCreatedElements.insertBefore( parentWrapperElement1 );
                                } else if( currentChildArray && currentChildArray.length > 0 ) {
                                    //Case if Element is having existing Child
                                    var parentWrapperElement2 = new CKEDITOR.dom.element( currentChildArray[ currentChildArray.length - 1 ].iinstanceData );
                                    wrapperElement.insertAfter( parentWrapperElement2 );
                                } else {
                                    // Insert after the last
                                    allCreatedElements.insertAfter( parentWrapperElement );
                                }

                                // Fire ready event for the new widget instances.
                                for( var cIndex1 in createdObjectInstanceList ) {
                                    var createdInst1 = createdObjectInstanceList[ cIndex1 ];
                                    createdInst1.ready = true;
                                    createdInst1.fire( 'ready' );
                                }

                            }
                        }
                    }
                    editor.eventBus.publish( "requirementDocumentation.newElementAddedSelectionChange" );
                }

                /**
                 * Handles LOV events from CKEditor
                 *
                 * @param {Object} widgetElement - widget instance
                 */
                function _handleCkeditorLOVs( widgetElement ) {
                    var lovSpanElements = widgetElement.getElementsByClassName( 'aw-requirement-lovProperties' );
                    for( var index = 0; index < lovSpanElements.length; index++ ) {
                        var span = lovSpanElements[ index ];
                        span.removeAttribute( "contenteditable" );
                        var lovElements = span.getElementsByTagName( "Select" );
                        if( lovElements && lovElements.length > 0 ) {
                            var lov = lovElements[ 0 ];
                            if( lov.hasAttribute( "multiple" ) ) {
                                lov.onchange = function( evt ) {
                                    var selectedOptionsObject = this.selectedOptions;
                                    var selectedOptions = Object.values( selectedOptionsObject ); //convert to array
                                    for( var i = 0; i < this.options.length; i++ ) {
                                        var option = this.options[ i ];
                                        if( selectedOptions.indexOf( option ) === -1 ) {
                                            option.removeAttribute( "selected" );
                                        } else {
                                            option.setAttribute( "selected", "selected" );
                                        }
                                    }
                                };
                            } else {
                                lov.onchange = function( evt ) {
                                    var selectedOption = this.options[ this.selectedIndex ];
                                    selectedOption.setAttribute( "selected", "selected" );
                                    for( var i = 0; i < this.options.length; i++ ) {
                                        var option = this.options[ i ];
                                        if( option !== selectedOption ) {
                                            option.removeAttribute( "selected" );
                                        }
                                    }
                                };
                            }
                        }
                    }
                }

                /**
                 * Create and add new widget
                 *
                 * @param {Object} widgetMetaData
                 */
                function _createNewWidget( widgetMetaData ) {
                    var preferedTemplate = widgetMetaData.preferedTemplate;

                    var widgetDef = editor.widgets.registered[ 'requirementWidget' ];
                    if( widgetDef && widgetDef.template ) {
                        var defaults = typeof widgetDef.defaults === 'function' ? widgetDef.defaults() : widgetDef.defaults;
                        var element = CKEDITOR.dom.element.createFromHtml( preferedTemplate.output( defaults ) );
                        var wrapper = editor.widgets.wrapElement( element, widgetDef.name );
                        var documentFragment = new CKEDITOR.dom.documentFragment( wrapper.getDocument() );

                        documentFragment.append( wrapper );
                        var instance = editor.widgets.initOn( element, widgetDef );

                        // Assign random id to the created object
                        element.setAttribute( "id", getRandomId() );

                        if( widgetMetaData.siblingId ) {
                            element.setAttribute( 'siblingId', widgetMetaData.siblingId );
                            element.setAttribute( 'siblingType', widgetMetaData.siblingType );
                        }
                        if( widgetMetaData.isChild ) {
                            widgetMetaData.parentWidget.createdChildElements.push( instance );
                        }
                        if( widgetMetaData.isSibling ) {
                            widgetMetaData.parentWidget.createdSiblingElements.unshift( instance );
                        }
                        element.setAttribute( 'parentId', widgetMetaData.parentId );
                        element.setAttribute( 'parentType', widgetMetaData.parentType );
                        element.setAttribute( 'parentItemType', widgetMetaData.parentItemType );

                        var wrapperElement = documentFragment.getFirst();
                        // Insert newly created object after selected element
                        var parentWrapperElement = new CKEDITOR.dom.element( widgetMetaData.parentWidget.element.$.parentNode );

                        var tempString = parentWrapperElement.$.querySelector( 'h3' ).innerText;
                        var sequence = tempString.split( " ", 1 );

                        var tempArrayOfNumber = [];
                        var widgets = editor.widgets.editor;
                        var widgetData = widgets.widgets.instances;
                        var parentIdOfCurrentElement;
                        var sequence2;
                        var htmlString;
                        var innerText;
                        var updatedText;
                        var indexes;
                        var childData;
                        // If Clicked on Add Child
                        if( widgetMetaData.isChild ) {
                            //Get content from clipboard in case of split requirement
                            if( CKEDITOR.SPLITREQ === true ) {
                                element.$.querySelector( 'div.aw-requirement-bodytext' ).innerHTML = '<p>' + CKEDITOR.plugins.clipboard.copyCutData._.nativeHtmlCache + '</p>';
                                CKEDITOR.SPLITREQ = false;
                            }
                            childData = getNextChildSamePGData( widgetData, sequence );
                            if( childData && childData.parentWrapperElement ) {
                                wrapperElement.$.querySelector( 'div.aw-requirement-header' ).innerHTML = childData.htmlString;
                                wrapperElement.insertAfter( childData.parentWrapperElement );
                            } else {
                                wrapperElement.insertAfter( parentWrapperElement );
                            }

                            // Fire postponed #ready event.
                            instance.ready = true;
                            instance.fire( 'ready' );
                            instance.objectTypesWithIcon = widgetMetaData.objectTypesWithIcon;
                            instance.setType( widgetMetaData.preferedType );
                            instance.setTypeIcon( widgetMetaData.preferedType );
                            scrollToNewWidget( editor, wrapperElement );
                            // Attach listeners to auto-select the initial contents
                            attachAutoSelectListener( instance );

                        } else { // If Clicked on Add Sibling
                            if( CKEDITOR.SPLITREQ === true ) {
                                element.$.querySelector( 'div.aw-requirement-bodytext' ).innerHTML = '<p>' + CKEDITOR.plugins.clipboard.copyCutData._.nativeHtmlCache + '</p>';
                                CKEDITOR.SPLITREQ = false;
                            }
                            for( var iinstance in widgetData ) {
                                var headerElement = widgetData[ iinstance ].wrapper.$.getElementsByClassName( "aw-requirement-header" );
                                if( headerElement && headerElement.length > 0 ) {
                                    innerText = headerElement[ 0 ].innerText;
                                    updatedText = innerText.replace( /(\r\n|\n|\r)/gm, "" );
                                    indexes = updatedText.split( " ", 1 );
                                    tempArrayOfNumber.push( { numberString: indexes[ 0 ], iinstanceData: widgetData[ iinstance ].wrapper.$ } );
                                    if( ( sequence.toString().localeCompare( indexes[ 0 ], 'en', { numeric: true } ) ) === 0 ) {
                                        parentIdOfCurrentElement = widgetData[ iinstance ].wrapper.$.firstElementChild.attributes[ 'parentid' ].nodeValue;
                                    }
                                }
                            }

                            tempArrayOfNumber = tempArrayOfNumber.sort( sortAlphaNum );
                            tempArrayOfNumber = cleaner( tempArrayOfNumber );

                            var arrayForLoop = existingSiblingUpdate( tempArrayOfNumber, parentIdOfCurrentElement, sequence );

                            updateChildAsperNewSibling( arrayForLoop, tempArrayOfNumber );

                            //Getting next sequence for new sibling and appending into DOM
                            sequence2 = nextNumber( sequence );
                            htmlString = '<h3 contenteditable="false" ><span contenteditable="false" style="cursor:pointer;">' + sequence2 + '</span><span><label contenteditable="true" data-placeholder="Title">' + ' ' + 'Title</label></span></h3>';
                            wrapperElement.$.querySelector( 'div.aw-requirement-header' ).innerHTML = htmlString;

                            var currentChildArray;
                            if( widgetMetaData.siblingId ) {
                                // Get an array of all the child elements
                                currentChildArray = _getArrayIndexOfGivenSequenceNumber( tempArrayOfNumber, sequence[ 0 ] );
                            }

                            //Case if Element is having existing Sibling
                            // If Sibling for the selection is exist
                            if( arrayForLoop.length > 0 ) {
                                var seqOfNext = arrayForLoop[ 0 ];
                                parentWrapperElement = new CKEDITOR.dom.element( _getDataForGivenIndexNumber( tempArrayOfNumber, seqOfNext[ 0 ] ).iinstanceData );
                                wrapperElement.insertBefore( parentWrapperElement );
                            } else if( currentChildArray && currentChildArray.length > 0 ) {
                                //Case if Element is having existing Child
                                parentWrapperElement = new CKEDITOR.dom.element( currentChildArray[ currentChildArray.length - 1 ].iinstanceData );
                                wrapperElement.insertAfter( parentWrapperElement );
                            } else {
                                wrapperElement.insertAfter( parentWrapperElement );
                            }

                            // Fire postponed #ready event.
                            instance.ready = true;
                            instance.fire( 'ready' );
                            instance.objectTypesWithIcon = widgetMetaData.objectTypesWithIcon;
                            instance.setType( widgetMetaData.preferedType );
                            instance.setTypeIcon( widgetMetaData.preferedType );
                            scrollToNewWidget( editor, wrapperElement );
                            // Attach listeners to auto-select the initial contents
                            attachAutoSelectListener( instance );
                        }

                        // fire change event after addition of new widget
                        editor.fire( 'change' );
                    }
                }

                var isNumberString = function( currentValue ) {
                    return !isNaN( currentValue );
                };
                var cleaner = function( arr ) {
                    return arr.filter( function( item ) {
                        return( typeof item.numberString === "string" && item.numberString.toString().split( "." ).every( isNumberString ) ) || ( typeof item.numberString === "number" && item.numberString );
                    } );
                };
                var nextNumber = function( inputString ) {
                    var tempString = inputString.toString().split( "." );
                    tempString.splice( tempString.length - 1, 1, parseInt( tempString[ tempString.length - 1 ] ) + 1 );
                    return tempString.join( '.' );
                };

                var nextChildNumber = function( inputString ) {
                    var tempString = inputString.toString().split( "." );
                    tempString.splice( tempString.length - 2, 1, parseInt( tempString[ tempString.length - 2 ] ) + 1 );
                    return tempString.join( '.' );
                };

                var sortAlphaNum = function( a, b ) {
                    return a.numberString.localeCompare( b.numberString, 'en', { numeric: true } );
                };

                var isHaveChild = function( parentSeq, allElementsArrayData ) {
                    return allElementsArrayData.numberString.toString().localeCompare( parentSeq.toString() + '.1', 'en', { numeric: true } ) === 0;
                };

                var updateChildAsperNewSibling = function( arrayForLoopChild, tempArrayOfNumber ) {
                    var parentIdOfCurrentElement;
                    for( var i = 0; i < arrayForLoopChild.length; i++ ) {
                        for( var index = 0; index < tempArrayOfNumber.length; index++ ) {
                            if( isHaveChild( arrayForLoopChild[ i ], tempArrayOfNumber[ index ] ) ) {
                                parentIdOfCurrentElement = tempArrayOfNumber[ index ].iinstanceData.firstElementChild.attributes[ 'parentid' ].nodeValue;
                                var arrayForIteration = childrenOfSiblingUpdate( tempArrayOfNumber, parentIdOfCurrentElement, arrayForLoopChild[ i ] );
                                if( arrayForIteration.length ) {
                                    updateChildAsperNewSibling( arrayForIteration, tempArrayOfNumber );
                                }
                            }
                        }
                    }
                };

                var existingSiblingUpdate = function( tempArrayOfNumber, parentIdOfCurrentElement, sequence ) {
                    var currentChildArray = [];
                    var siblingArray = [];
                    var nextSibling;
                    var nextToNextSibling;
                    var startIndex;
                    var endIndex;
                    var widgetSiblingData;
                    var arrayForLoop = [];

                    //for Creating an array of all the child elements
                    for( var index = 0; index < tempArrayOfNumber.length; index++ ) {
                        if( parentIdOfCurrentElement === tempArrayOfNumber[ index ].iinstanceData.firstElementChild.attributes[ 'parentid' ].nodeValue ) {
                            currentChildArray.push( tempArrayOfNumber[ index ] );
                        }
                    }
                    //for Creating an array of all the sibling elements and their index
                    for( index = 0; index < currentChildArray.length; index++ ) {
                        if( ( sequence.toString().localeCompare( currentChildArray[ index ].numberString, 'en', { numeric: true } ) ) < 0 ) {
                            siblingArray.push( currentChildArray[ index ] );
                        }
                    }
                    //Updating the existing indexes of the siblings
                    for( index = 0; index < siblingArray.length; index++ ) {
                        widgetSiblingData = siblingArray[ index ].iinstanceData.querySelector( 'div.aw-requirement-header h3' );
                        //Case if Existing sibling is created in the current Operation
                        if( widgetSiblingData.querySelector( 'span' ) ) {
                            widgetSiblingData = widgetSiblingData.querySelector( 'span' );
                            nextSibling = widgetSiblingData.innerText.split( " ", 1 );
                            startIndex = widgetSiblingData.innerText.indexOf( " " );
                            arrayForLoop.push( nextSibling );
                            if ( startIndex === -1 ) {
                                widgetSiblingData.innerText = nextNumber( nextSibling );
                            } else {
                                widgetSiblingData.innerText = nextNumber( nextSibling ) + widgetSiblingData.innerText.substring( startIndex );
                            }
                        } else {
                            nextSibling = widgetSiblingData.innerText.split( " ", 1 );
                            nextToNextSibling = nextNumber( nextSibling );
                            startIndex = widgetSiblingData.innerText.indexOf( " " );
                            endIndex = widgetSiblingData.innerText.length;
                            widgetSiblingData.innerText = nextToNextSibling + widgetSiblingData.innerText.substring( startIndex, endIndex );
                            arrayForLoop.push( nextSibling );
                        }
                    }
                    return arrayForLoop;
                };

                var childrenOfSiblingUpdate = function( tempArrayOfNumber, parentIdOfCurrentElement, sequence ) {
                    var currentChildArray = [];
                    var siblingArray = [];
                    var nextSibling;
                    var nextToNextSibling;
                    var startIndex;
                    var endIndex;
                    var widgetSiblingData;
                    var arrayForLoop = [];

                    //for Creating an array of all the child elements
                    for( var index = 0; index < tempArrayOfNumber.length; index++ ) {
                        if( parentIdOfCurrentElement === tempArrayOfNumber[ index ].iinstanceData.firstElementChild.attributes[ 'parentid' ].nodeValue ) {
                            currentChildArray.push( tempArrayOfNumber[ index ] );
                        }
                    }
                    //for Creating an array of all the sibling elements and their index
                    for( index = 0; index < currentChildArray.length; index++ ) {
                        if( ( sequence.toString().localeCompare( currentChildArray[ index ].numberString, 'en', { numeric: true } ) ) < 0 ) {
                            siblingArray.push( currentChildArray[ index ] );
                        }
                    }
                    //Updating the existing indexes of the siblings
                    for( index = 0; index < siblingArray.length; index++ ) {
                        widgetSiblingData = siblingArray[ index ].iinstanceData.querySelector( 'div.aw-requirement-header h3' );
                        //Case if Existing sibling is created in the current Operation
                        if( widgetSiblingData.querySelector( 'span' ) ) {
                            widgetSiblingData = widgetSiblingData.querySelector( 'span' );
                            nextSibling = widgetSiblingData.innerText.split( " ", 1 );
                            arrayForLoop.push( widgetSiblingData.innerText );
                            startIndex = widgetSiblingData.innerText.indexOf( " " );
                            if ( startIndex === -1 ) {
                                widgetSiblingData.innerText = nextChildNumber( nextSibling );
                            } else {
                                widgetSiblingData.innerText = nextChildNumber( nextSibling ) + widgetSiblingData.innerText.substring( startIndex );
                            }
                        } else {
                            nextSibling = widgetSiblingData.innerText.split( " ", 1 );
                            nextToNextSibling = nextChildNumber( nextSibling );
                            startIndex = widgetSiblingData.innerText.indexOf( " " );
                            endIndex = widgetSiblingData.innerText.length;
                            widgetSiblingData.innerText = nextToNextSibling + widgetSiblingData.innerText.substring( startIndex, endIndex );
                            arrayForLoop.push( nextSibling );
                        }
                    }
                    return arrayForLoop;
                };

                var getLeafChildinHierarchy = function( arrAllElements, currentElement ) {

                    var currentChildArray = [];
                    //for Creating an array of all the child elements
                    for( var index = 0; index < arrAllElements.length; index++ ) {
                        if( currentElement.id === arrAllElements[ index ].parentId ) {
                            currentChildArray.push( arrAllElements[ index ] );
                        }
                    }
                    var countChild = currentChildArray.length;
                    if( countChild > 0 ) {
                        return getLeafChildinHierarchy( arrAllElements, currentChildArray[ countChild - 1 ] )

                    } else {
                        return currentElement;
                    }
                }
                /**
                 * Add Child Method
                 * @param {Object} widgetData //
                 * @param {String} sequence //
                 * @returns {Object} dataObject //
                 */
                function getNextChildSamePGData( widgetData, sequence ) {
                    var tempArrayOfNumber = [];
                    var parentIdOfCurrentElement;
                    var currentChildArray = [];
                    var sequence2;
                    var htmlString;
                    var innerText;
                    var updatedText;
                    var indexes;
                    var parentWrapperElement;

                    // for top most object there will be no para number, so consider it as a 0
                    if( !( typeof sequence[ 0 ] === "string" && sequence[ 0 ].toString().split( "." ).every( isNumberString ) ) || ( typeof sequence[ 0 ] === "number" && sequence[ 0 ] ) ) {
                        sequence[ 0 ] = "0";
                    }

                    //for Creating an array of all the instances present on page
                    for( var iinstance in widgetData ) {
                        if( widgetData[ iinstance ].ready ) {
                            var headerElement = widgetData[ iinstance ].wrapper.$.getElementsByClassName( "aw-requirement-header" );
                            if( headerElement && headerElement.length > 0 ) {
                                innerText = headerElement[ 0 ].innerText;
                                updatedText = innerText.replace( /(\r\n|\n|\r)/gm, "" );
                                indexes = updatedText.split( " ", 1 );
                                if( !( typeof indexes[ 0 ] === "string" && indexes[ 0 ].toString().split( "." ).every( isNumberString ) ) || ( typeof indexes[ 0 ] === "number" && indexes[ 0 ] ) ) {
                                    indexes[ 0 ] = "0";
                                }
                                var idWidget = widgetData[ iinstance ].wrapper.$.firstElementChild.id;
                                var idParent = widgetData[ iinstance ].wrapper.$.firstElementChild.attributes[ 'parentid' ].nodeValue;

                                tempArrayOfNumber.push( {
                                    numberString: indexes[ 0 ],
                                    iinstanceData: widgetData[ iinstance ].wrapper.$,
                                    id: idWidget,
                                    parentId: idParent
                                } );
                                if( ( sequence.toString().localeCompare( indexes[ 0 ], 'en', { numeric: true } ) ) === 0 ) {
                                    parentIdOfCurrentElement = widgetData[ iinstance ].wrapper.$.firstElementChild.attributes[ 'id' ].nodeValue;
                                    parentWrapperElement = new CKEDITOR.dom.element( widgetData[ iinstance ].wrapper.$ );
                                }
                            }
                        }

                    }
                    tempArrayOfNumber = tempArrayOfNumber.sort( sortAlphaNum );
                    tempArrayOfNumber = cleaner( tempArrayOfNumber );

                    //for Creating an array of all the child elements
                    for( var index = 0; index < tempArrayOfNumber.length; index++ ) {
                        if( parentIdOfCurrentElement === tempArrayOfNumber[ index ].iinstanceData.firstElementChild.attributes[ 'parentid' ].nodeValue ) {
                            currentChildArray.push( tempArrayOfNumber[ index ] );
                        }
                    }

                    //Case if Element is having existing Child
                    if( currentChildArray && currentChildArray[ 0 ] && currentChildArray[ 0 ].iinstanceData ) {
                        // If selected is the top most, Get the last element from the editor to add the created object below to it
                        if( sequence[ 0 ] === "0" ) {
                            parentWrapperElement = new CKEDITOR.dom.element( tempArrayOfNumber[ tempArrayOfNumber.length - 1 ].iinstanceData );
                        } else {
                            var element = getLeafChildinHierarchy( tempArrayOfNumber, currentChildArray[ currentChildArray.length - 1 ] );
                            parentWrapperElement = new CKEDITOR.dom.element( element.iinstanceData );
                        }

                        sequence2 = nextNumber( currentChildArray[ currentChildArray.length - 1 ].numberString );
                    } else {
                        // if selected is the top most and there is not child created yet
                        if( sequence[ 0 ] === "0" ) {
                            sequence2 = nextNumber( sequence[ 0 ] );
                        } else {
                            sequence2 = sequence.toString() + '.1';
                        }
                    }
                    //Getting next sequence for new child and appending into DOM
                    htmlString = '<h3 contenteditable="false" ><span contenteditable="false" style="cursor:pointer;">' + sequence2 + '</span><span><label contenteditable="true" data-placeholder="Title">' + ' ' + 'Title</label></span></h3>';

                    var dataObject = { htmlString: htmlString, parentWrapperElement: parentWrapperElement };
                    return dataObject;
                }

                /**
                 * Return the data for the given index number
                 * @param {Array} dataArray - array of the widget instances with their respective sequence numbers
                 * @param {Number} indexNo - sequence number
                 * @returns {Object} dataObject
                 */
                function _getDataForGivenIndexNumber( dataArray, indexNo ) {
                    for( var i in dataArray ) {
                        var data = dataArray[ i ];
                        if( data.numberString === indexNo ) {
                            return data;
                        }
                    }
                }

                /**
                 * Return the array of child objects for the given sequence number
                 * @param {Array} dataArray - array of the widget instances with their respective sequence numbers
                 * @param {Number} sequence - sequence number
                 * @returns {Array} array of child objects
                 */
                function _getArrayIndexOfGivenSequenceNumber( dataArray, sequence ) {
                    var startIndex = null;
                    var currentChildArray = [];
                    for( var i in dataArray ) {
                        var data = dataArray[ i ];
                        if( startIndex !== null ) {
                            if( data.numberString.indexOf( sequence ) === 0 ) {
                                currentChildArray.push( data );
                            }
                        }
                        if( data.numberString === sequence ) {
                            startIndex = i;
                        }
                    }
                    return currentChildArray;
                }

                /**
                 * Add Child Method
                 * @param {Object} widgetData //
                 * @param {String} sequence //
                 * @param {object} parentMetaData //
                 * @returns {Object} dataObject
                 */
                function getNextChildLastPGData( widgetData, sequence, parentMetaData ) {
                    var sequence2;
                    var htmlString;
                    var tempArrayOfNumber = [];
                    var innerText;
                    var updatedText;
                    var indexes;
                    var flagForPosition = 'insertAfter';

                    //for Creating an array of all the instances present on page
                    for( var iinstance in widgetData ) {
                        var headerElement = widgetData[ iinstance ].wrapper.$.getElementsByClassName( "aw-requirement-header" );
                        if( headerElement && headerElement.length > 0 ) {
                            innerText = headerElement[ 0 ].innerText;
                            updatedText = innerText.replace( /(\r\n|\n|\r)/gm, "" );
                            indexes = updatedText.split( " ", 1 );
                            tempArrayOfNumber.push( { numberString: indexes[ 0 ], iinstanceData: widgetData[ iinstance ].wrapper.$ } );
                        }
                    }
                    tempArrayOfNumber = tempArrayOfNumber.sort( sortAlphaNum );
                    tempArrayOfNumber = cleaner( tempArrayOfNumber );
                    var parentWrapperElement = new CKEDITOR.dom.element( tempArrayOfNumber[ tempArrayOfNumber.length - 1 ].iinstanceData );
                    sequence2 = sequence + '.' + nextNumber( parentMetaData );

                    if( ( sequence2.toString().localeCompare( tempArrayOfNumber[ tempArrayOfNumber.length - 1 ].numberString, 'en', { numeric: true } ) ) === 0 ) {
                        sequence2 = nextNumber( sequence2 );
                        flagForPosition = 'insertBefore';
                    } else if( ( sequence2.toString().localeCompare( tempArrayOfNumber[ tempArrayOfNumber.length - 1 ].numberString, 'en', { numeric: true } ) ) === -1 ) {
                        sequence2 = nextNumber( tempArrayOfNumber[ tempArrayOfNumber.length - 1 ].numberString );
                        flagForPosition = 'insertBefore';
                    } else {
                        //do nothing
                    }

                    htmlString = '<h3 contenteditable="false" ><span contenteditable="false" style="cursor:pointer;">' + sequence2 + '</span><span><label contenteditable="true" data-placeholder="Title">' + ' ' + 'Title</label></span></h3>';
                    var dataObject = { htmlString: htmlString, parentWrapperElement: parentWrapperElement, flagForPosition: flagForPosition };
                    return dataObject;
                }

                /**
                 * Get meta data information for the new widget
                 *
                 * @param {object} addOption //
                 * @param {object} callback //
                 */
                function getNewWidgetMetaData( addOption, callback ) {

                    var _isChild;
                    var _isSibling;
                    var _parentWidget;
                    var _siblingId;
                    var _siblingType;
                    var _parentId;
                    var _parentType;
                    var _parentItemType;
                    var _objectTypesWithIcon;
                    var _preferedType;
                    var _preferedTemplate;

                    var parentWidget = editor.config.selectedRequirementWidget;
                    if( !parentWidget ) {
                        var selection = editor.getSelection();
                        var ranges = selection.getRanges();
                        if( ranges && ranges.length > 0 ) {
                            var range = ( editor.getSelection().getRanges()[ 0 ] );
                            var startNode = range.startContainer;
                            var cursorElement = getElementNode( editor.editable(), startNode );
                            if( cursorElement ) {
                                parentWidget = editor.widgets.getByElement( cursorElement );
                            }
                        }
                    }

                    if( parentWidget ) {

                        _parentWidget = parentWidget;

                        var id = parentWidget.element.$.id;
                        var type = parentWidget.element.$
                            .getAttribute( 'objectType' );
                        var itemType = parentWidget.element.$
                            .getAttribute( 'itemType' );

                        var pId = parentWidget.element.$
                            .getAttribute( 'parentId' );
                        var pType = parentWidget.element.$
                            .getAttribute( 'parentType' );
                        var pItemType = parentWidget.element.$
                            .getAttribute( 'parentItemType' );

                        var parentId = null;
                        var parentType = null;
                        var parentItemType = null;
                        var _firstTimeCreation = "";
                        // for child creation, set only parent element
                        if( addOption && addOption === "CHILD" || !pId ) { //CHILD
                            // Add widget to created child list
                            if( !parentWidget.createdChildElements ) {
                                parentWidget.createdChildElements = [];
                            }
                            _isChild = true;

                            // set parent information
                            parentId = id;
                            parentType = type;
                            parentItemType = itemType;
                            _firstTimeCreation = pId;
                        } else { // SIBLING
                            // Add widget to created sibling list
                            if( !parentWidget.createdSiblingElements ) {
                                parentWidget.createdSiblingElements = [];
                            }
                            _isSibling = true;

                            // set parent information
                            parentId = pId;
                            parentType = pType;
                            parentItemType = pItemType;

                            _siblingId = id;
                            _siblingType = type;
                        }

                        _parentId = parentId;
                        _parentType = parentType;
                        _parentItemType = parentItemType;

                        var typeWithIconMap = getAllowedTypesFromGlobalTypeMap( parentItemType );
                        if( typeWithIconMap ) {
                            _objectTypesWithIcon = typeWithIconMap.objectTypesWithIcon;
                            _preferedType = typeWithIconMap.preferredType;
                            _preferedTemplate = getTemplateFromGlobalTemplateMap( typeWithIconMap.preferredType );
                        }

                        var widgetMetaData = {
                            isChild: _isChild,
                            isSibling: _isSibling,
                            parentWidget: _parentWidget,
                            siblingId: _siblingId,
                            siblingType: _siblingType,
                            parentId: _parentId,
                            parentType: _parentType,
                            parentItemType: _parentItemType,
                            objectTypesWithIcon: _objectTypesWithIcon,
                            preferedType: _preferedType,
                            preferedTemplate: _preferedTemplate,
                            firstTimeCreation: _firstTimeCreation
                        };

                        // If type is not cached, load it from server
                        if( !_objectTypesWithIcon ) {
                            var selected = {
                                "type": parentItemType
                            };

                            var eventData = {
                                "selected": selected,
                                "callback": function( response ) {
                                    widgetMetaData.objectTypesWithIcon = response.objectTypesWithIcon;
                                    widgetMetaData.preferedType = response.preferredType;
                                    widgetMetaData.preferedTemplate = getTemplateFromGlobalTemplateMap( response.preferredType );
                                    if( callback ) {
                                        callback( widgetMetaData );
                                    }
                                }
                            };
                            var eventBus = editor.eventBus;
                            eventBus.publish( "ACEXRTHTMLEditor.getDisplayableTypes", eventData );
                        } else {
                            if( callback ) {
                                callback( widgetMetaData );
                            }
                        }
                        // Clear last selection
                        editor.config.selectedRequirementWidget = null;
                    }
                }

                /**
                 * Return the allowed child type info for the given parent item type
                 *
                 * @param {String} parentItemType
                 * @return {Object} type information
                 */
                function getAllowedTypesFromGlobalTypeMap( parentItemType ) {
                    // Try to get the allowed types from the cached map
                    if( editor.config.objectTypeGlobalMap ) {
                        for( var i = 0; i < editor.config.objectTypeGlobalMap.length; i++ ) {
                            var typeWithIconMap = editor.config.objectTypeGlobalMap[ i ];
                            var type = typeWithIconMap.parentType;
                            if( type.toLowerCase() === parentItemType.toLowerCase() ) {
                                return typeWithIconMap;
                            }
                        }
                    }
                    return null;
                }

                /**
                 * Return the associated template for the given item type
                 *
                 * @param {String} itemType
                 * @return {Object} template
                 */
                function getTemplateFromGlobalTemplateMap( itemType ) {
                    // Try to get the allowed types from the cached map
                    if( editor.config.objectTemplateGlobalMap ) {
                        for( var i = 0; i < editor.config.objectTemplateGlobalMap.length; i++ ) {
                            var templateInfo = editor.config.objectTemplateGlobalMap[ i ];
                            if( templateInfo.realTypeName.toLowerCase() === itemType.toLowerCase() ) {
                                return templateInfo.template;
                            }
                        }
                    }
                    return null;
                }

                /**
                 * Attach listener to keyboard and modify isdirty on keypress is selected element is contenteditable
                 *
                 * @param {Object} evt
                 */
                function captureKeyboard( evt ) {
                    if( selectedElement && selectedElement.getAttribute ) {
                        var canModify = selectedElement.getAttribute( "contenteditable" );
                        //only change dirty flag if can modify
                        if( canModify === "true" ) {
                            selectedElement.setAttribute( "isDirty", true );
                        }
                    }
                }

                /**
                 * Attach listeners to auto-select the initial contents for Title & Content
                 *
                 * @param {widget} widget
                 */
                function attachAutoSelectListener( widget ) {
                    var bodyTextElement = widget.element.$.getElementsByClassName( "aw-requirement-bodytext" );
                    if( bodyTextElement && bodyTextElement.length > 0 ) {
                        var contentElement = bodyTextElement[ 0 ];
                        contentElement.addEventListener( "focus", selectElementContent );
                    }

                    var titleElement = widget.editables.title;
                    titleElement.$.firstChild.addEventListener( "focus", selectElementContent );

                    // AutoSelect title for newly added widget
                    setTimeout( function() {
                        titleElement.$.firstChild.focus();
                    }, 0 );
                }

                /**
                 * Select the content of element, if it is initially added text.
                 *
                 * @param {evt} event
                 */
                function selectElementContent( event ) {
                    var element = ( event.currentTarget ) ? event.currentTarget : event.srcElement;
                    var range, selection;
                    var doc = editor.document.$;
                    var win = editor.window.$;

                    // Select the text, if element contains the initial text.
                    if( element.dataset.placeholder && element.textContent === element.dataset.placeholder ) {
                        if( doc.body.createTextRange && win.getSelection ) {
                            range = doc.body.createTextRange();
                            range.moveToElementText( element );
                            selection = win.getSelection();
                            selection.removeAllRanges();
                            range.select();
                        } else if( win.getSelection ) {
                            range = doc.createRange();
                            range.selectNodeContents( element );
                            selection = win.getSelection();
                            selection.removeAllRanges();
                            selection.addRange( range );
                        }
                    }
                }

                /**
                 * Attach add element menu list on click of add element command
                 *
                 * @param {evt} click even
                 */
                function addElementClickHandler( event ) {
                    var target = ( event.currentTarget ) ? event.currentTarget : event.srcElement;
                    var targetElement = new CKEDITOR.dom.element( target );
                    var nestedWidget = getNestedEditable( editor.editable(), targetElement );
                    if( nestedWidget ) {
                        var selectedWidget = editor.widgets.getByElement( nestedWidget );
                        var addMenuData = getAddMenuData( selectedWidget );
                        if( selectedWidget && addMenuData ) {
                            // Create panel definition for add menu
                            var panelDef = {};
                            panelDef.title = "";
                            panelDef.width = "auto";
                            panelDef.height = "auto";
                            panelDef.menuList = addMenuData;
                            // Create and attach the menu
                            var menuPanel = new CKEDITOR.ui.rmMenuPanel( editor, panelDef );
                            menuPanel.attach( new CKEDITOR.dom.element( ( event.currentTarget ) ? event.currentTarget : event.srcElement ) );
                        }
                    }
                }

                /**
                 * Returns the options for add element, Child/Sibling
                 *
                 * @param {widget} widget element
                 */
                function getAddElementOptions( widget ) {
                    var addOptions = [];
                    var id = widget.element.$.id;
                    // Can not create child of newly added object.
                    if( id && id !== "" ) {
                        addOptions.push( editor.childTitle );
                    }
                    var parentId = widget.element.$.getAttribute( 'parentId' );
                    // Can not create sibling for top object.
                    if( parentId && parentId !== "" ) {
                        addOptions.push( editor.siblingTitle );
                    }
                    return addOptions;
                }

                /**
                 * Create and return the list of add menu in the JSON format
                 *
                 * @param {widget} widget
                 */
                function getAddMenuData( widget ) {
                    // --- Construct Menu
                    var addOptions = getAddElementOptions( widget );
                    editor.config.selectedRequirementWidget = widget;
                    var menuList = [];

                    if( addOptions.length > 1 ) {
                        for( var i = 0; i < addOptions.length; i++ ) {
                            var addOption = addOptions[ i ];

                            menuList.push( {
                                label: addOption,
                                icon: null,
                                selected: false,
                                actionHandler: addOption === editor.childTitle ? "addChildRequirementWidget" : "addSiblingRequirementWidget"
                            } );
                        }
                    } else {
                        editor.execCommand( 'addSiblingRequirementWidget' );
                        return null;
                    }

                    return menuList;
                }

                /**
                 * Generate and return the random alphanumeric ID for the newly created object
                 */
                function getRandomId() {
                    var randomId = Math.random().toString( 36 ).substr( 2, 10 );
                    return "RM::NEW::" + randomId;
                }

                /**
                 * Attach type menu list on click of type element
                 *
                 * @param {evt} click even
                 */
                function changeTypeClickHandler( event ) {
                    var target = ( event.currentTarget ) ? event.currentTarget : event.srcElement;
                    var targetElement = new CKEDITOR.dom.element( target );
                    var nestedWidget = getNestedEditable( editor.editable(), targetElement );
                    if( nestedWidget ) {
                        var selectedWidget = editor.widgets.getByElement( nestedWidget );
                        if( selectedWidget ) {
                            // Create panel definition for menu
                            var panelDef = {};
                            panelDef.title = "";
                            panelDef.width = "auto";
                            panelDef.height = "auto";
                            panelDef.menuList = getTypeMenuData( selectedWidget );
                            // Create and attach the menu
                            var menuPanel = new CKEDITOR.ui.rmMenuPanel( editor, panelDef );
                            menuPanel.attach( new CKEDITOR.dom.element( ( event.currentTarget ) ? event.currentTarget : event.srcElement ) );
                        }
                    }
                }

                /**
                 * Create and return the list of menu in the JSON format
                 *
                 * @param {widget} widget
                 */
                function getTypeMenuData( widget ) {

                    // --- Construct Menu
                    var objectTypesWithIcon = widget.objectTypesWithIcon;

                    var selectedType = widget.getType();
                    var selectedTypeObject = getTypeObject( objectTypesWithIcon, selectedType );

                    var menuList = [];

                    for( var i = 0; i < objectTypesWithIcon.length; i++ ) {
                        var typeWithIcon = objectTypesWithIcon[ i ];

                        var isSelected = false;
                        if( selectedTypeObject && selectedTypeObject.typeName === typeWithIcon.typeName ) {
                            isSelected = true;
                        }

                        menuList.push( {
                            label: typeWithIcon.displayTypeName,
                            icon: typeWithIcon.typeIconURL,
                            selected: isSelected,
                            actionHandler: typeWithIcon.typeName
                        } );

                        // Add command for menu action
                        editor.addCommand( typeWithIcon.typeName, {
                            exec: function( editor ) {
                                widget.setType( this.name );
                                widget.setTypeIcon( this.name );
                                mapElementUpdatedTypes[ widget.element.$.id ] = widget.element.$.getAttribute( 'objectType' );
                                var template = getTemplateFromGlobalTemplateMap( this.name );
                                if( template ) {
                                    changeWidgetTemplate( widget, editor, template );
                                }
                            }
                        } );
                    }
                    return menuList;
                }

                /**
                 * Replace the last widget with the new widget of different type.
                 *
                 * @param {widget} widget
                 */
                function changeWidgetTemplate( widget, editor, template ) {
                    var widgetDef = editor.widgets.registered[ 'requirementWidget' ];
                    if( widgetDef && widgetDef.template ) {
                        var defaults = typeof widgetDef.defaults === 'function' ? widgetDef.defaults() : widgetDef.defaults;
                        var element = CKEDITOR.dom.element.createFromHtml( template.output( defaults ) );

                        var newWidgetContentElement = element.$.getElementsByClassName( "aw-requirement-content" )[ 0 ];
                        var oldWidgetContentElement = widget.element.$.getElementsByClassName( "aw-requirement-content" )[ 0 ];

                        // Copy attributes from old widget to new
                        for( var i = 0; i < oldWidgetContentElement.attributes.length; i++ ) {
                            var a = oldWidgetContentElement.attributes[ i ];
                            newWidgetContentElement.setAttribute( a.name, a.value );
                        }

                        // copy the body text as it is in the new div to show on client
                        var newBodyTextElement = newWidgetContentElement.getElementsByClassName( "aw-requirement-bodytext" );
                        var oldBodyTextElement = oldWidgetContentElement.getElementsByClassName( "aw-requirement-bodytext" );

                        if( newBodyTextElement && newBodyTextElement.length > 0 && oldBodyTextElement && oldBodyTextElement.length > 0 ) {
                            newBodyTextElement[ 0 ].innerHTML = oldBodyTextElement[ 0 ].innerHTML;
                        }

                        oldWidgetContentElement.parentNode.replaceChild( newWidgetContentElement, oldWidgetContentElement );

                        // updating editabl;e as the create input take data from editable
                        widget.initEditable( "content", { selector: ".aw-requirement-content" } );
                        // fire ready event to check check readonly properties and add the attributes accordingly.
                        widget.fire( 'ready' );

                        // Attach listeners to auto-select the initial contents
                        attachAutoSelectListener( widget );
                    }
                }

                /**
                 * Make element as non editable
                 *
                 * @param {element} element
                 */
                function makeElementNonEditable( element ) {
                    element.removeAttributes( [
                        'contenteditable',
                        'data-cke-widget-editable',
                        'data-cke-enter-mode'
                    ] );
                }

                /**
                 * Make element as editable
                 *
                 * @param {element} element
                 */
                function makeElementEditable( element ) {
                    element.setAttribute( 'contenteditable', true );
                    element.setAttribute( 'data-cke-enter-mode', "1" );
                    element.setAttribute( 'data-cke-widget-editable', "content" );
                }

                /**
                 * Make element as editable
                 *
                 * @param {element} element
                 */
                function makePropertiesElementEditable( element ) {
                    if( element && element.getAttribute( 'contenteditable' ) === 'true' ) {

                        element.setAttribute( 'data-cke-enter-mode', "1" );
                    }
                }

                /**
                 * Scroll the contents to the newly added widget
                 *
                 * @param {editor} editor
                 * @param {widgetElement} widget element to scroll upto
                 */
                function scrollToNewWidget( editor, widgetElement ) {
                    widgetElement.scrollIntoView();
                    var range = editor.createRange();
                    range.moveToPosition( widgetElement, CKEDITOR.POSITION_AFTER_END );
                }

                /**
                 * Gets the CKEDITOR.dom.element closest to the 'node'
                 *
                 * @param {CKEDITOR.dom.element}
                 *            guard Stop ancestor search on this node
                 *            (usually editor's editable).
                 * @param {CKEDITOR.dom.node}
                 *            node Start the search from this node.
                 * @returns {CKEDITOR.dom.element/null} Element or
                 *          `null` if not found.
                 */
                function getNestedEditable( guard, node ) {
                    if( !node || node.equals( guard ) )
                        return null;

                    if( isRequirementWidget( node ) )
                        return node;

                    return getNestedEditable( guard, node.getParent() );
                }

                // Checks whether node is a requirement widget
                function isRequirementWidget( node ) {
                    return node.type === CKEDITOR.NODE_ELEMENT &&
                        hasClass( node, 'requirement' );
                }

                // Checks if element has given class
                function hasClass( element, cls ) {
                    return( ' ' + element.$.className + ' ' )
                        .indexOf( ' ' + cls + ' ' ) > -1;
                }

                /**
                 * Looks inside wrapper element to find a node that
                 * matches given selector and is not nested in other
                 * widget.
                 *
                 * @param {String}
                 *            selector Selector to match.
                 * @returns {CKEDITOR.dom.element} Matched element or
                 *          `null` if a node has not been found.
                 */
                function getWidgetElementByClassName( widget, selector ) {
                    var matchedElements = widget.wrapper.find( selector ),
                        match, closestWrapper;

                    for( var i = 0; i < matchedElements.count(); i++ ) {
                        match = matchedElements.getItem( i );
                        closestWrapper = match
                            .getAscendant( isDomWidgetWrapper );

                        // The closest ascendant-wrapper of this
                        // match defines to which widget
                        // this match belongs. If the ascendant is
                        // this widget's wrapper
                        // it means that the match is not nested in
                        // other widget.
                        if( widget.wrapper.equals( closestWrapper ) ) {
                            return match;
                        }
                    }

                    return null;
                }

                // Checks whether the `node` is a
                // CKEDITOR.plugins.widget#wrapper
                function isDomWidgetWrapper( node ) {
                    return node.type === CKEDITOR.NODE_ELEMENT &&
                        node
                        .hasAttribute( 'data-cke-widget-wrapper' );
                }

                /**
                 * Return the object type
                 *
                 * @param {objectTypesWithIcon} list of object types
                 * @param {typeName} type internal name
                 */
                function getTypeObject( objectTypesWithIcon, typeName ) {
                    for( var key in objectTypesWithIcon ) {
                        var value = objectTypesWithIcon[ key ];
                        if( value.typeName.toLowerCase() === typeName
                            .toLowerCase() ) {
                            return value;
                        }
                    }
                    return null;
                }

                /**
                 * Attach setting menu list on click of settings command
                 *
                 * @param {evt} click event
                 */
                function tocSettingClickHandler( event ) {
                    var target = event.srcElement;
                    var targetElement = new CKEDITOR.dom.element( target );
                    var selectedWidget = editor.widgets.getByElement( targetElement );
                    var addMenuData = getTOCSettingMenuData( selectedWidget );
                    if( selectedWidget && addMenuData ) {
                        // Create panel definition for add menu
                        var panelDef = {};
                        panelDef.title = "";
                        panelDef.width = "auto";
                        panelDef.height = "auto";
                        panelDef.menuList = addMenuData;
                        // Create and attach the menu
                        var menuPanel = new CKEDITOR.ui.rmMenuPanel( editor, panelDef );
                        menuPanel.attach( new CKEDITOR.dom.element( event.srcElement ) );
                    }
                }
                /**
                 * Create and return the list of toc setting menu in the JSON format
                 *
                 * @param {widget} widget
                 */
                function getTOCSettingMenuData( widget ) {
                    // --- Construct Menu
                    var settingOptions = getTOCSettingElementOptions( widget );
                    editor.config.selectedRequirementWidget = widget;
                    var menuList = [];
                    for( var i = 0; i < settingOptions.length; i++ ) {
                        var settingOption = settingOptions[ i ];
                        menuList.push( {
                            label: settingOption,
                            icon: null,
                            selected: false,
                            actionHandler: settingOption === editor.update ? "updateTOC" : "deleteTOC"
                        } );
                    }
                    return menuList;
                }
                /**
                 * Returns the options for update and delete TOC
                 *
                 * @param {widget} widget element
                 */
                function getTOCSettingElementOptions( widget ) {
                    var settingOptions = [];
                    settingOptions.push( editor.update );
                    settingOptions.push( editor.delete );
                    return settingOptions;
                }

                /**
                 * Gets the CKEDITOR.dom.element closest to the 'node'
                 *
                 * @param {CKEDITOR.dom.element}
                 *            guard Stop ancestor search on this node
                 *            (usually editor's editable).
                 * @param {CKEDITOR.dom.node}
                 *            node Start the search from this node.
                 * @returns {CKEDITOR.dom.element/null} Element or
                 *          `null` if not found.
                 */
                function getElementNode( guard, node ) {
                    if( !node || node.equals( guard ) )
                        return null;

                    if( node.type === CKEDITOR.NODE_ELEMENT )
                        return node;

                    return getElementNode( guard, node.getParent() );
                }
            }

        } );
