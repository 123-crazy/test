/**
 * Plugin for generating updating and deleting Table of Content
 */
/*global
 CKEDITOR
 */
CKEDITOR.plugins.add('rmContentTable', {
    init: function (editor) {
        editor.on('contentDom', function (evt) {
            var editable = editor.editable();
            editable.attachListener(editable, 'click', function (evt) {
                var eventBus = editor.eventBus;
                var selection = editor.getSelection();
                var selectedText = selection.getSelectedText();
                var range = selection.getRanges();
                var eventData = {
                    enableTOC: true
                }
                if ((selection.document.$.activeElement.className === "aw-requirement-bodytext" || selection.document.$.activeElement.parentElement.className === "aw-requirement-bodytext") && selectedText === "") {
                    //If TOC not exist in document then enable command
                    if (!this.editor.document.$.getElementById("TOC")) {
                        eventBus.publish("requirementDocumentation.enableTableContentCmd", eventData);
                    } else {
                        eventData.enableTOC = false;
                        eventBus.publish("requirementDocumentation.enableTableContentCmd", eventData);
                    }
                    //If clicked on TOC item then navigate to it
                    if (range[0].startContainer.$.parentNode && range[0].startContainer.$.parentNode.id.startsWith("liid") && evt.data.$.target.tagName !== "svg" && !evt.data.$.target.ownerSVGElement) {
                        navigateToObject(range[0].startContainer.$.parentNode.id);
                    }
                } else {
                    eventData.enableTOC = false;
                    eventBus.publish("requirementDocumentation.enableTableContentCmd", eventData);
                }
                if ((selection.document.$.activeElement.className === "aw-requirement-bodytext" || selection.document.$.activeElement.parentElement.className === "aw-requirement-bodytext")) {
                    eventBus.publish("requirementDocumentation.selectionChangedinCkEditor", { isSelected: true });
                }
                else if ((selection.document.$.activeElement.className !== "aw-requirement-bodytext" || selection.document.$.activeElement.parentElement.className !== "aw-requirement-bodytext")) {
                    eventBus.publish("requirementDocumentation.selectionChangedinCkEditor", { isSelected: false });
                }
            });

        });
        // Add command to update TOC
        editor.addCommand('updateTOC', {
            exec: function (editor) {
                var ol = editor.document.$.getElementById("TOCOL");
                if (ol) {
                    while (ol.firstChild) {
                        ol.removeChild(ol.firstChild);
                    }
                    createListItems(ol);
                } else {
                    //Will execute only if TOC added in Ckeditor 5 and opened in ckeditor 4 then ID to OL tag is not supported
                    //Need to click on save after update to see setting icon
                    var div = editor.document.$.getElementById("TOC");
                    if (div) {
                        div.remove();
                    }
                    createTOCDivContent();
                }
            }
        });
        // Add command to delete TOC
        editor.addCommand('deleteTOC', {
            exec: function (editor) {
                var tocElement = editor.document.$.getElementById("TOC");
                tocElement.parentNode.removeChild(tocElement);
            }
        });

        function navigateToObject(uid) {
            var eventBus = editor.eventBus;
            var widgets = editor.widgets.instances;
            var id = uid.substr(4);
            //If element present in document then scroll to it and select else open it in new tab
            for (var w in widgets) {
                var widget = widgets[w];
                var openInNewTab = true;
                if (widget.element.$.getAttribute("revisionid") === id) {
                    widget.element.scrollIntoView(true);
                    var eventDataForuid = {
                        "objectsToSelect": [{ "uid": widget.element.$.id }]
                    };
                    eventBus.publish("aceElementsSelectionUpdatedEvent", eventDataForuid);
                    openInNewTab = false;
                    break;

                }
            }
            if (openInNewTab) {
                var eveventDataForuid = {
                    uid: id
                };
                eventBus.publish("requirementDocumentation.openReqInNewTab", eveventDataForuid);
            }
        }

        var timer = setTimeout(function () {
            // Subscribe an event to handle the TOC command
            _subscribeEventToGenerateTableofContent();
        }, 500);

        /**
         * Method to Subscribe an event to handle the TOC command
         */
        function _subscribeEventToGenerateTableofContent() {
            // Unsubscribe event first if already subscribed
            if (CKEDITOR._eventToHandleGenerateTableofContent) {
                editor.eventBus.unsubscribe(CKEDITOR._eventToHandleGenerateTableofContent);
                CKEDITOR._eventToHandleGenerateTableofContent = null;
            }
            CKEDITOR._eventToHandleGenerateTableofContent = editor.eventBus.subscribe("requirementDocumentation.executeGenerateTableContentCmd", function (eventData) {
                //set everything up
                var eventBus = editor.eventBus;
                createTOCDivContent();
                var eventData = {
                    enableTOC: false
                }
                eventBus.publish("requirementDocumentation.enableTableContentCmd", eventData);
            });
        }
        function createTOCDivContent(){
            var element = new CKEDITOR.dom.element("div");
                element.$.setAttribute('contenteditable', false);
                element.$.setAttribute('id', "TOC");
                element.$.classList.add("aw-requirement-toconHover");
                element.$.classList.add("aw-requirement-tocFont");
                Container = new CKEDITOR.dom.element('ol');
                Container.$.setAttribute('id', "TOCOL");
                Container.$.classList.add('aw-requirement-tocOl');
                createListItems(Container);
                var settings = CKEDITOR.dom.element.createFromHtml('<settingsIcon> </settingsIcon>');
                element.append(settings);
                element.append(Container);
                editor.insertElement(element);
        }
        function createListItems(Container) {
            var widgets = editor.widgets.instances;
            var reqWidgets = [];
            for (var w in widgets) {
                var widget = widgets[w];
                reqWidgets.unshift(widget);
            }
            for (var wdgt in reqWidgets) {
                var widget = reqWidgets[wdgt];
                var reqElement = widget.element.$.querySelector('div.aw-requirement-header h3');
                var text;
                if (reqElement) {
                    text = widget.element.$.querySelector('div.aw-requirement-header h3').innerText;
                    if (text == null || text.trim() === '') {
                        text = '&nbsp;'
                    }else {
                        var title = text.split(" ", 1);
                        var reqNo = title[0].split(".");
                        var space = 0;
                        for (j = 0; j < reqNo.length; j++) {
                            //Some space for title
                            if (wdgt === "0") {
                                continue;
                            }
                            space = space + 5;
                        }
                    }
                    
                    var uid = widget.element.$.getAttribute('revisionid');
                    var id = "liid".concat(uid);
                    var liNode;
                    if (space === 0 || space === 5) {
                        liNode = CKEDITOR.dom.element.createFromHtml('<li id=' + id + ' class="aw-requirement-tocUnderlineOnHover" style = padding-left:' + space + 'px;>' + text + '</li>');
                        liNode.$.style.setProperty('font-weight', 'bold');
                    } else {
                        liNode = CKEDITOR.dom.element.createFromHtml('<li id=' + id + ' class="aw-requirement-tocUnderlineOnHover" style = padding-left:' + space + 'px;>' + text + '</li>');
                    }
                    if (Container.$) {
                        Container.$.appendChild(liNode.$);
                    } else {
                        Container.appendChild(liNode.$);
                    }
                }
            };
        }
    }
});
