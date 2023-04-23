/*global
 CKEDITOR
 */

CKEDITOR.plugins.add('rmOleHandler',
    {
        init: function (editor) {
            // Add event to download ole on double click
            editor.on('doubleclick', function (evt) {
                var element = evt.data.element;

                if (element && element.is('img') && element.hasAttribute("oleid")) {
                    // Fire an event to download ole
                    var eventBus = editor.eventBus;

                    var eventData = {
                        "targetElement": element.$
                    };
                    eventBus.publish("requirementDocumentation.handleOLEClick", eventData);

                    // Do not open default dialog like images
                    evt.cancel();
                    evt.stop();
                    return false;
                }
            });

            // Only add this button if browser supports File API
            if (window.File) {

                editor.addCommand('rmOleCommand',
                    {
                        exec: function (editor) {
                            var form = document.createElement("form");
                            form.setAttribute("id", "fileUploadForm");

                            var input = document.createElement("input");
                            form.appendChild(input);
                            //form.append("fmsFile",input);

                            input.setAttribute("type", "file");
                            input.setAttribute("id", "fmsFile");
                            input.setAttribute("name", "fmsFile");

                            input.addEventListener('change', function () {

                                var file = this.files[0];

                                if (file) {


                                    var eventBus = editor.eventBus;

                                    var eventData = {
                                        "clientid": this.value,
                                        "file": file,
                                        "form": this.form
                                    };
                                    eventBus.publish("requirementDocumentation.InsertOLEInCKEditor",
                                        eventData);


                                }

                            }, false);

                            input.click();
                        },
                        startDisabled: true
                    });

                editor.on('selectionChange', function (evt) {
                    var myCommand = this.getCommand('rmOleCommand');
                    if (myCommand) {
                        var ranges = this.getSelection().getRanges();
                        if (ranges && ranges.length > 0 && !ranges[0].checkReadOnly()) {

                            //Disable rmOleCommand command for title of object
                            var startNode = ranges[0].startContainer;
                            var target = startNode && startNode.$ ? startNode.$ : null;
                            if (startNode && startNode.$ && startNode.$.nodeType === 3) {
                                target = startNode.$.parentElement;
                            }
                            if ((target && target.classList && target.classList.contains('aw-requirement-properties')) ||
                                (target && target.nodeName && target.nodeName.toUpperCase() === 'LABEL' && target.dataset && target.dataset.placeholder && target.dataset.placeholder === 'Title')) {
                                    myCommand.disable();
                                }
                                else
                                {
                                    myCommand.enable();
                                }
                            } else {
                                myCommand.disable();
                            }
                        }
                    });

                editor.ui.addButton('rmOleUpload',
                    {
                        label: editor.insertOLE,
                        command: 'rmOleCommand',
                        icon: editor.getBaseURL + editor.getBaseUrlPath + "/image/cmdInsertOLE16.svg",
                        toolbar: 'insert,10'
                    });
            }
        }
    });
