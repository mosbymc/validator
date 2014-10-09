/*

The MIT License (MIT) 
Copyright © 2014

Permission is hereby granted, free of charge, to any person obtaining a copy of this 
software and associated documentation files (the “Software”), to deal in the Software 
without restriction, including without limitation the rights to use, copy, modify, merge, 
publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons 
to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or 
substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING 
BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


    validator.js

*/

//The starting point of valdation
var validator =  function() {
    this.init = function (events) {
        $(document).on("click", "input", function (event) {  //Bind form event listener and create "options" object when an input with the "formValidate" class is clicked.
            var target = event.currentTarget;
            if ($(target).data("form") !== undefined) {
                var form = $("#" + $(target).data("form"));
                if (form.hasClass("formValidate")) {
                    var time = new Date().getTime();
                    var formOptions = {
                        form: $(target).data("form"),
                        display: form.hasClass("hover") === false ? false : "hover",
                        success: form.data("formaction") || null,
                        modalId: form.data("modalid") || null,
                        groupErrors: form.data("grouperrors") || null,
                        callBefore: form.data("beforevalidate") || false,
                        group: form.hasClass("groupByInput"),
                        button: $(target),
                        time: time
                    };
                    Object.freeze(formOptions);
                    $(target).prop("disabled", true);
                    callBeforeValidate(form, formOptions);
                }
            }
        });

        $(document).on("click", "button", function(event) {  //Bind form event listener and create "options" object when button with the "formValidate" class is clicked.
            var target = event.currentTarget;
            if ($(target).data("form") !== undefined) {
                var form = $("#" + $(target).data("form"));
                if (form.hasClass("formValidate")) {
                    var time = new Date().getTime();
                    var formOptions = {
                        form: $(target).data("form"),
                        display: form.hasClass("hover") === false ? false : "hover",
                        success: form.data("formaction") || null,
                        modalId: form.data("modalid") || null,
                        groupErrors: form.data("grouperrors") || null,
                        callBefore: form.data("beforevalidate") || false,
                        group: form.hasClass("groupByInput"),
                        button: $(target),
                        time: time
                    };
                    Object.freeze(formOptions);
                    $(target).prop("disabled", true);
                    callBeforeValidate(form, formOptions);
                }
            }
        });

        $(document).on("input", "input", function(event) {      //Bind input event listener on input event. The input itself or its parent must have the "inputValidate" class.
            var target = event.currentTarget;
            var time, inputOptions;
            if (!$(target).hasClass("inputValidate") && ($(target).data("validateon") === "input" || $(target).data("validateon") === undefined)) {
                var parent = $(target).parents(".inputValidate:first");
                if (parent !== undefined) {
                    var exclude = parent.data("excludeinputs");
                    if (exclude !== undefined && exclude.indexOf(target.id) === -1) {
                        time = new Date().getTime();
                        inputOptions = {
                            input: target,
                            display: $(target).hasClass("hover") === false ? false : "hover",
                            success: $(target).data("inputaction") || null,
                            modalId: $(target).data("modalid") || null,
                            group: $(target).hasClass("groupByInput") === false ? $(target).parents(".formValidate:first").hasClass("groupByInput") : $(target).hasClass("groupByInput"),
                            time: time
                        };
                        Object.freeze(inputOptions);
                        validateInput($(target), inputOptions);
                    }
                }
            }
            else if ($(target).hasClass("inputValidate") && ($(target).data("validateon") === "input" || $(target).data("validateon") === undefined)) {
                time = new Date().getTime();
                inputOptions = {
                    input: target,
                    display: $(target).hasClass("hover") === false ? false : "hover",
                    success: $(target).data("inputaction") || null,
                    modalId: $(target).data("modalid") || null,
                    group: $(target).hasClass("groupByInput") === false ? $(target).parents(".formValidate:first").hasClass("groupByInput") : $(target).hasClass("groupByInput"),
                    time: time
                };
                Object.freeze(inputOptions);
                validateInput($(target), inputOptions);
            }
        });

        $(document).on("keypress", "input", function(event) {   //Bind event listener for the keypress event on an input. Used for restricting character input.
            var target = event.currentTarget;
            if ($(target).hasClass("restrictInput") && $(target).data("inputtype") !== undefined) {
                var restrictOptions = {
                    input: target,
                    type: $(target).data("inputtype")
                }
                var valid = monitorChars($(target), restrictOptions, event);
                if (!valid) {
                    event.preventDefault();
                }
            }
        });

        $(document).on("focus", "input", function(event) {  //Help text listener. Will display help text for a given input when focused.
            var target = event.currentTarget;
            if ($(target).prevUntil(":input").filter(".helptext:first").length > 0 && $("[id^='" + $(target)[0].id + "error']").length < 1 && $("#" + $(target)[0].id + "InputGrp").length < 1) {
                var helptext = $(target).prevUntil(":input").filter(".helptext:first");
                var modal = null;
                if ($(target).data("modalid") === undefined) {
                    if ($(target).parents(".formValidate:first").length > 0) {
                        modal = $(target).parents(".formValidate:first").data("modalId") || null;
                    }
                    else if ($(target).parents(".inputValidate:first").length > 0) {
                        modal = $(target).parents(".inputValidate:first").data("modalId") || null;
                    }
                    else {
                        modal = null;
                    }
                }
                else {
                    modal = $(target).data("modalid");
                }
                var helpOptions = {
                    input: target,
                    modalId: modal,
                    helpText: helptext
                };
                Object.freeze(helpOptions);
                displayHelpText(helpOptions);
            }
        });

        $(document).on("blur", "input", function(event) {   //Remove help text on blur.
            var target = event.currentTarget;
            if ($(target).prevUntil(":input").filter(".helptext:first").length > 0) {
                var helptext = $(target).prevUntil(":input").filter(".helptext:first");
                $(target).data("displayhelptext", "false");
                helptext.addClass("hideMessage");
                helptext.removeClass("showMessage");
            }
        });

        if (events !== undefined) {     //Bind any passed in events for inputs to listen for.
            $.each(events, function(index, val) {
                try {
                    $(document).on(val, "input", function(event) {
                        var target = event.currentTarget;
                        var inputOptions, time;
                        if (!$(target).hasClass("inputValidate") && $(target).data("validateon") === val) {
                            var parent = $(target).parents(".inputValidate:first");
                            if (parent !== undefined) {
                                var exclude = parent.data("excludeinputs");
                                if (exclude !== undefined && exclude.indexOf(target.id) === -1) {
                                    time = new Date().getTime();
                                    inputOptions = {
                                        input: target,
                                        display: $(target).hasClass("hover") === false ? false : "hover",
                                        success: $(target).data("inputaction") || null,
                                        modalId: $(target).data("modalid") || null,
                                        group: $(target).parents(".formValidate:first").hasClass("groupByInput"),
                                        time: time
                                    };
                                    Object.freeze(inputOptions);
                                    validateInput($(target), inputOptions);
                                }
                            }
                        }
                        else if ($(target).hasClass("inputValidate") && $(target).data("validateon") === val) {
                            time = new Date().getTime();
                            inputOptions = {
                                input: target,
                                display: $(target).hasClass("hover") === false ? false : "hover",
                                success: $(target).data("inputaction") || null,
                                modalId: $(target).data("modalid") || null,
                                group: $(target).parents(".formValidate:first").hasClass("groupByInput"),
                                time: time
                            };
                            Object.freeze(inputOptions);
                            validateInput($(target), inputOptions);
                        }
                    });
                }
                catch(ex) {
                    console.log("Could not bind forms to event: '" + val + "'");
                    console.log(ex);
                }
            });
        }
    };

    this.validate = function(formId) {    //Public function for starting off the validation process.
        var form = $("#" + formId);
        if (form !== undefined && form.hasClass("formValidate")) {
            var button = form.find("[data-form='" + formId + "']");
            var time = new Date().getTime();
            var formOptions = {
                form: form[0].id,
                display: form.hasClass("hover") === false ? false : "hover",
                success: form.data("formaction") || null,
                modalId: form.data("modalid") || null,
                groupErrors: form.data("grouperrors") || null,
                callBefore: form.data("beforevalidate") || false,
                group: form.hasClass("groupByInput"),
                button: button,
                time: time
            };
            button.prop("disabled", true);
            callBeforeValidate(form, formOptions);
        }
    }

    var validateInput = function(input, options) {  //Where inputs go to be validated and the success function called if supplied.
        var inputObj;
        var inputArray = [];
        var elem = $(input);

        if (elem.attr("data-requiredfield") !== undefined) {    //Build out the inputArray with validation rules: required, type, and custom.
            inputObj = {
                input: $(input),
                rule: "required",
                valid: "waiting"
            }
            inputArray.push(inputObj);
        }

        var typeRules = elem.data("type");
        var rules;
        if (typeRules !== undefined && typeRules.split(",").length > 0) {
            rules = typeRules.split(",");
            for (var l = 0; l < rules.length; l++) {
                inputObj = {
                    input: $(input),
                    rule: rules[l],
                    valid: "waiting"
                }
                inputArray.push(inputObj);
            }
        }

        var customRules = elem.data('customrules');
        if (customRules !== undefined && customRules.split(",").length > 0) {
            rules = customRules.split(",");
            for (var k = 0; k < rules.length; k++) {
                inputObj = {
                    input: $(input),
                    rule: rules[k],
                    valid: "waiting"
                }
                inputArray.push(inputObj);
            }
        }
        
        validateElement(input, options, inputArray);    //Main function where validation is done.
        finalizeValidation(inputArray, options);        //Checks when the validation is complete if it should call the succes function, sends event, etc.
    };

    var callBeforeValidate = function(form, options) {
        if (options.callBefore !== false) {     //Run the "call before" function if it's supplied, and continue validation if true.
            var fn = window[options.callBefore];
            if (typeof fn === "function") {
                try {
                    fn.call(this, form, options, validateForm);
                }
                catch (ex) {
                    console.log("'Call before' function: '" + options.callBefore + "'' failed to execute");
                    console.log(ex);
                    validateForm(true, form, options);
                }
            }
        }
        else {
            validateForm(true, form, options);
        }
    };

    this.validateForm = function(continueValidation, form, options) {    //Used as both a callback and internally if no call before function is supplied.
        if (continueValidation) {   //Only continue validating if given the go ahead from the "call before" function.
            if (options.groupErrors !== null) {     //Remove previous grouped validation errors before validating a new input.
                $("#" + options.groupErrors).empty();
                $("#" + options.groupErrors).removeClass("showGroupedErrors");
                $("#" + options.groupErrors).addClass("hideGroupedErrors");
            }

            var inputs = $(form).find(":input").filter(":input");
            var inputArray = [];
            var rules;
            for (var j = 0; j < inputs.length; j++) {   //Build out the inputArray for each input with the required/type/custom rules and their status.
                var inputObj;
                var elem = $(inputs[j]);
                if (elem.attr("data-requiredfield") !== undefined) {
                    inputObj = {
                        input: $(inputs[j]),
                        rule: "required",
                        valid: "waiting"
                    }
                    inputArray.push(inputObj);
                }
                var typeRules = elem.data("type");
                if (typeRules !== undefined && typeRules.split(",").length > 0) {
                    rules = typeRules.split(",");
                    for (var l = 0; l < rules.length; l++) {
                        inputObj = {
                            input: $(inputs[j]),
                            rule: rules[l],
                            valid: "waiting"
                        }
                        inputArray.push(inputObj);
                    }
                }
                var customRules = elem.data('customrules');
                if (customRules !== undefined && customRules.split(",").length > 0) {
                    rules = customRules.split(",");
                    for (var k = 0; k < rules.length; k++) {
                        inputObj = {
                            input: $(inputs[j]),
                            rule: rules[k],
                            valid: "waiting"
                        }
                        inputArray.push(inputObj);
                    }
                }
            }

            for (var i = 0; i < inputs.length; i++) {
                validateElement(inputs[i], options, inputArray);    //Validate each input element in the form.
            }
            finalizeValidation(inputArray, options);
        }
    }

    var validateElement = function(element, options, inputsArray) {      //Starting point for single input validation - reached by both forms and inputs.
        var elem = $(element);
        var failedRequired = false; //Determines whether it should continue validation after testing the required functionality.
        var typeRules = elem.data("type");  //The predefined rules that are part of this library.
        var customRules = elem.data('customrules'); //User defined validation rules.
        var isRequired = elem.attr("data-requiredfield");
        var rules;

        elem.data("vts", options.time);

        if (isRequired !== undefined || typeRules !== undefined || customRules !== undefined) { //remove any previous error div from the previous validation attempt.
            removeErrorText(elem);
            var toDisplay = getOtherElem(elem);
            toDisplay.removeClass("invalid");
            toDisplay.removeClass("alignInput");
        }

        if (isRequired !== undefined) {
            var tested = required(elem);
            if (!tested.valid) {
                failedRequired = true;
                createErrorMessage(elem, tested, options, "required", 0, 0);
                groupByForm(options, elem, "required");
                groupByInput(options, elem, "required");
            }
            for (var i = 0; i < inputsArray.length; i++) {
                if (elem[0] === inputsArray[i].input[0] && "required" === inputsArray[i].rule) {
                    inputsArray[i].valid = tested.valid;
                }
            }
        }

        //If the input passed the required validation or didn't need it, then continue to "type rules" and custom rules.
        if (!failedRequired) {
            if (typeRules !== undefined) {
                rules = typeRules.split(',');
                $.each(rules, function(index, value) {
                    var fn = dataTypeRules[value];
                    if (typeof fn === "function") {
                        var tested = fn.call(this, elem);
                        if (!tested.valid) {    //If validation fail, create the error message element
                            var errorOffsets = getMessageOffset(elem);
                            createErrorMessage(elem, tested, options, value, errorOffsets.width, errorOffsets.height);
                            groupByForm(options, elem, value);
                            groupByInput(options, elem, value); //See if these can be moved to the createErrorMessage function
                        }
                        for (var i = 0; i < inputsArray.length; i++) {  //See about moving this out a step
                            if (elem[0] === inputsArray[i].input[0] && value === inputsArray[i].rule) {
                                inputsArray[i].valid = tested.valid;
                            }
                        }
                    }
                });
            }
            
            if (customRules !== undefined) {
                rules = customRules.split(',');
                $.each(rules, function(index, value) {
                    if (value === "required")
                        return;
                    var fn = window[value];
                    if (typeof fn === "function") {
                        var inputState = {
                            option: options,
                            element: elem,
                            rule: value,
                            inputArray: inputsArray
                        };
                        Object.freeze(inputState);
                        try {
                            fn.call(this, elem, inputState, customRulesCallback);
                        }
                        catch(ex) {
                            console.log("Failed to execute custom rule: '" + inputState.rule + "'', for element: '" + inputState.element[0].id.toString() + "'");
                            console.log(ex);
                            for (var k = 0; k < inputsArray.length; k++) {
                                for (var l = 0; l < rules.length; l++) {
                                    if (elem[0] === inputsArray[k].input[0] && rules[l] === inputsArray[k].rule) {
                                        inputsArray[k].valid = null;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
        else {
            for (var k = 0; k < inputsArray.length; k++) {
                if (elem[0] === inputsArray[k].input[0] && inputsArray[k].rule !== "required") {
                    inputsArray[k].valid = null;
                }
            }
        }
    };

    this.customRulesCallback = function(tested, inputState) {
        try {
            var timeStamp = inputState.element.data("vts");
            if (!tested.valid && timeStamp === inputState.option.time) {    //If validation fail, create the error message element
                var errorOffsets = getMessageOffset(inputState.element);

                createErrorMessage(inputState.element, tested, inputState.option, inputState.rule, errorOffsets.width, errorOffsets.height);
                groupByForm(inputState.option, inputState.element, inputState.rule);
                groupByInput(inputState.option, inputState.element, inputState.rule);
            }
            for (var i = 0; i < inputState.inputArray.length; i++) {
                if (inputState.element[0] === inputState.inputArray[i].input[0] && inputState.rule === inputState.inputArray[i].rule) {
                    inputState.inputArray[i].valid = tested.valid;
                }
            }
            finalizeValidation(inputState.inputArray, inputState.option);
        }
        catch(ex) {
            console.log("Returned parameters from custom validation rule: '" + inputState.rule + "', are not in the correct format.");
            console.log(ex);
            inputState.option.button.prop("disabled", false);
        }
    }

    var finalizeValidation = function(inputArray, options) {
        var numFailed = 0;
        for (var i = 0; i < inputArray.length; i++) {
            if (inputArray[i].valid === "waiting") {
                return;
            }
            else if (inputArray[i].valid === false) {
                numFailed++;
            }
        }

        if (options.groupErrors !== undefined && options.groupErrors !== null) {
            var form = $("#" + options.form);
            if (form.hasClass("highlightErrors")) {
                form.find(":input").each(function(idx, input) {
                    $(input).on("focus", $(input), function() {
                        $("[data-parentinput='" + input.id + "']").each(function(index, val) {
                            $(val).addClass("groupHighlight");
                        });
                    });
                    $(input).on("blur", $(input), function() {
                        $("[data-parentinput='" + input.id + "']").each(function(index, val) {
                            $(val).removeClass("groupHighlight");
                        });
                    });
                });
            }
        }

        if (options.button !== undefined) {
            options.button.prop("disabled", false);
        }

        $(document).trigger("validated", [{
            type: "validation",
            element: options.form !== undefined ? options.form : options.input,
            passed: numFailed === 0,
            count: numFailed,
            time: new Date()
        }]);

        if (numFailed === 0) {       //If the form passed validation, call the success function if one was supplied.
            var fn = window[options.success];
            if (typeof fn === "function") {
                try {
                   fn.call(this); 
                }
                catch(ex) {
                    console.log("'Success' function: '" + options.success + "'' failed to execute");
                    console.log(ex);
                }
            }
        }
    };

    var groupByInput = function(options, elem, rule) {
        if (options.group) {
            var toDisplay = getOtherElem(elem);
            if ($("#" + elem[0].id + "InputGrp").length === 0) {
                toDisplay.parent().append("<div id='" + elem[0].id + "InputGrp' data-parentinput='" + elem[0].id + "' class='inputGroup'></div>");
            }
            toDisplay.addClass("alignInput");
            var errorToMove = $("#" + elem[0].id + "error" + rule);
            var html = errorToMove.html();
            var span = "<span class='inputGrpErrorSpan'>" + html + "</span></br>";
            $("#" + elem[0].id + "InputGrp").append(span);
            errorToMove.remove();
        }
    };

    var groupByForm = function(options, input, rule) {
        if (options.groupErrors !== undefined && options.groupErrors !== null) {    //If the errors should be grouped, grab all error divs for the current input and put them in the div.
            $("#" + input[0].id + "error" + rule).each(function(index, val) {
                var prefix = $(input).data("errorprefix");
                if (prefix !== undefined) {
                    var text = $(val).html();
                    $(val).html(prefix + ": " + text);
                }
                var html = $(val).html();
                var span = "<span class='errorSpan' id='formGrp" + input[0].id + rule + "' data-parentinput='" + input[0].id + "'>" + html + "</span>";
                placeErrorSpan(options, input[0].id, span, rule);
                $(val).remove();
            });
            var grpContainer = $("#" + options.groupErrors);
            if (!grpContainer.hasClass("showGroupedErrors")) {
                grpContainer.removeClass("hideGroupedErrors");
                grpContainer.addClass("showGroupedErrors");
            }
        }
    };

    var placeErrorSpan = function(options, inputId, span, rule) {
        var errorSpans = $("#" + options.groupErrors).children(".errorSpan");
        var foundSibling = false;
        if (errorSpans !== undefined && errorSpans.length > 0) {
            errorSpans.each(function(index, val) {
                if ($(val).data("parentinput") === inputId) {
                    $(span).insertBefore($(val));
                    var thisSpan = $("#formGrp" + inputId + rule);
                    $("</br>").insertAfter(thisSpan);
                    foundSibling = true;
                    return false;
                }
            });
            if (!foundSibling) {
                var inputs = $("#" + options.form).find(":input");
                var parentInput = $("#" + inputId);
                var inputIndex = inputs.index(parentInput);
                if (inputIndex < inputs.length - 1) {
                    for (var i = inputIndex + 1; i < inputs.length; i++) {
                        var siblingSpan = $("#" + options.groupErrors).children("[data-parentinput='" + inputs[i].id + "']");
                        if ($("#" + options.groupErrors).children("[data-parentinput='" + inputs[i].id + "']").length > 0) {
                            $(span).insertBefore(siblingSpan);
                            var thisSpan = $("#formGrp" + inputId + rule);
                            $("</br>").insertAfter(thisSpan);
                            foundSibling = true;
                            break;
                        }
                    }
                    if (!foundSibling) {
                        $("#" + options.groupErrors).append(span);
                        $("#" + options.groupErrors).append("</br>");
                    }
                }
            }
        }
        else {
            $("#" + options.groupErrors).append(span);
            $("#" + options.groupErrors).append("</br>");
        }
    };

    var createErrorMessage = function(element, errorData, options, errorName, offsetWidth, offsetHeight) {
        //Can't pass messageDiv in here because it hasn't been created yet.
        displayErrorText(element, errorData, options, errorName, offsetWidth, offsetHeight);

        var messageDiv = $("#" + element[0].id + "error" + errorName);
        if ((element).prevUntil(":input").filter(".helptext:first").length > 0) {
            var helptext = element.prevUntil(":input").filter(".helptext:first");
            helptext.addClass("hideMessage");
            helptext.removeClass("showMessage");
        }
        if (options.display === "hover") {
            displayErrorTextOnHover(options, element, messageDiv, offsetWidth, offsetHeight);
        }
        else if (options.display !== "hover" && options.modalId === null) {
            adjustTextOnScroll(element, messageDiv, offsetWidth, offsetHeight);
        }

        if (options.display !== "hover" && options.modalId !== null) {
            scrollModalListener(options, element, offsetWidth, offsetHeight, messageDiv);
        }
    };

    var displayErrorText = function(element, errorData, options, errorName, offsetWidth, offsetHeight) {
        var toDisplay = getOtherElem(element);
        toDisplay.addClass("invalid");
        var popupId = element[0].id + "error" + errorName;
        if ($("#" + popupId).length < 1) {
            var popupDiv = "<div id='" + popupId + "' data-parentinput='" + element[0].id + "'></div>";
            toDisplay.parent().append(popupDiv);
            var popup = $("#" + popupId);
            popup.addClass("errorMessage");
            var errorMessage = errorData.message === undefined ? "Validation Error" : errorData.message;
            popup.html(errorMessage);
            popup.css('width', errorData.width === undefined ? "" : errorData.width);
            setErrorPos(element, offsetWidth, offsetHeight, popup);
            if (options.display === "hover") {
                popup.addClass("hideMessage");
                popup.removeClass("showMessage");
            }
            else {
                popup.addClass("showMessage");
                popup.removeClass("hideMessage");
            }
        }
    };

    var determinePlacement = function(position, element, offsetWidth, offsetHeight, messageDiv) {
        var location = element.data("location") === undefined ? "right" : element.data("location");
        var offset = getElemOffset(element);
        var messageWidth = messageDiv.width();
        var height = messageDiv.height();
        switch (location)
        {
            case "right": 
                return [position.left + element.width() + offsetWidth + offset.left + 8 - $(window).scrollLeft(), position.top - $(window).scrollTop() - offset.top];
            case "left":
                return [position.left - messageWidth - offsetWidth - offset.left - 8 - $(window).scrollLeft(), position.top - $(window).scrollTop() - offset.top];
            case "top":
                return [position.left + offset.left - $(window).scrollLeft(), position.top - $(window).scrollTop() - 5 - height - offsetHeight - offset.top];
            case "bottom":
                return [position.left + offset.left - $(window).scrollLeft(), position.top - $(window).scrollTop() + element[0].clientHeight + 8 + offsetHeight + offset.top];
            default:
                return [position.left + element.width() + offsetWidth + offset.left + 8 - $(window).scrollLeft(), position.top - $(window).scrollTop() - offset.top];
        }
    };

    var removeErrorText = function(element) {
        $("[id^='" + element[0].id + "error']").each(function(index, val) {
            $(val).remove();
        });
        if ($("[id^='" + element[0].id + "error']").length < 1) {
            var toDisplay = getOtherElem(element);
            toDisplay.css("border", "");
        }
        $("[id^='" + element[0].id + "InputGrp']").each(function(index, val) {
            $(val).remove();
        });
    };

    var setErrorPos = function(element, offsetWidth, offsetHeight, messageDiv) {
        var position = getOtherElem(element).offset();
        var placement = determinePlacement(position, element, offsetWidth, offsetHeight, messageDiv);
        messageDiv.addClass("showMessage");
        messageDiv.removeClass("hideMessage");
        messageDiv.css('top', placement[1]);
        messageDiv.css('left', placement[0]);

        return placement;
    };

    var displayErrorTextOnHover = function(options, element, messageDiv, offsetWidth, offsetHeight) {
        var toDisplay = getOtherElem(element);
        toDisplay.bind("mouseover", function () {
            if (options.modalId !== null) {
                if (isContainerVisible(options, element, offsetWidth, offsetHeight, messageDiv)) {
                    setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
                    return;
                }
                return;
            }
            setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
        });

        toDisplay.bind("mouseout", function () {
            messageDiv.addClass("hideMessage");
            messageDiv.removeClass("showMessage");
        });
    };

    var adjustTextOnScroll = function(element, messageDiv, offsetWidth, offsetHeight) {
        $(window).scroll(function() {
            setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
        });
    };

    var isContainerVisible = function(options, element, offsetWidth, offsetHeight, messageDiv) {
        var position = getOtherElem(element).offset();
        var placement = determinePlacement(position, element, offsetWidth, offsetHeight, messageDiv);
        var modal = $("#" + options.modalId);
        var modaloffset = modal.offset();
        var modalTop = modaloffset.top - $(window).scrollTop();
        var modalBottom = modalTop + modal.height();
        var modalLeft = modaloffset.left - $(window).scrollLeft();
        var modalRight = modalLeft + modal.width();

        if ((modalTop > placement[1]) || (modalBottom < placement[1]) ) {
            return false;
        }

        if ((modalLeft > placement[0]) || (modalRight < placement[0] + messageDiv.width())) {
            return false;
        }
        return true;
    }

    var scrollModalListener = function(options, element, offsetWidth, offsetHeight, messageDiv) {
        if (!isContainerVisible(options, element, offsetWidth, offsetHeight, messageDiv)) {
            messageDiv.addClass("hideMessage");
            messageDiv.removeClass("showMessage");
        }

        $("#" + options.modalId).on("scroll", function() {
            if (!isContainerVisible(options, element, offsetWidth, offsetHeight, messageDiv)) {
                messageDiv.addClass("hideMessage");
                messageDiv.removeClass("showMessage");
            }
            else {
                setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
                messageDiv.removeClass("hideMessage");
                messageDiv.addClass("showMessage");
            }
        });

        $(window).scroll(function() {
            if (!isContainerVisible(options, element, offsetWidth, offsetHeight, messageDiv)) {
                messageDiv.addClass("hideMessage");
                messageDiv.removeClass("showMessage");
            }
            else {
                setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
                messageDiv.removeClass("hideMessage");
                messageDiv.addClass("showMessage");
            }

        });
    };

    var helpTextScrollModalListener = function(options, element, offsetWidth, offsetHeight, messageDiv) {
        if (!isContainerVisible(options, element, offsetWidth, offsetHeight, messageDiv)) {
            messageDiv.addClass("hideMessage");
            messageDiv.removeClass("showMessage");
        }

        $("#" + options.modalId).on("scroll", hideShowDiv);

        $(window).on("scroll", hideShowDiv);
        
        function hideShowDiv() {
            if (element.data("displayhelptext") !== undefined && element.data("displayhelptext") !== "false") {
                if (!isContainerVisible(options, element, offsetWidth, offsetHeight, messageDiv)) {
                    messageDiv.addClass("hideMessage");
                    messageDiv.removeClass("showMessage");
                }
                else {
                    setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
                    messageDiv.removeClass("hideMessage");
                    messageDiv.addClass("showMessage");
                }
            }
        }
    };

    var getMessageOffset = function(element) {
        var width = 0;
        var height = 0;
        if ($("[id^='" + element[0].id + "error']").length !== 0) {
            $("[id^='" + element[0].id + "error']").each(function(index, val) {
                width += $(val).width() + 5;
                height += $(val).height() + 5;
            });
        }
        return {width: width, height: height};
    }

    var getElemOffset = function(element) {     //gets the user-defined offset for the error messages from the element they are being displayed for.
        var offsetWidth = 0;
        var offsetHeight = 0;
        if (element.data("offsetwidth") !== undefined) {
            offsetWidth = element.data("offsetwidth");
        }
        if (element.data("offsetheight") !== undefined) {
            offsetHeight = element.data("offsetheight");
        }
        return {left: offsetWidth, top: offsetHeight};
    };

    var getOtherElem = function(element) {
        //If the error text should be displayed on a different element, will search through the dom till it finds the specified element.
        var displayOther = element.data("displayon") === undefined ? null : element.data("displayon");
        var other = undefined;
        var ident = undefined;
        var move = undefined;
        if (displayOther !== null) {
            other = displayOther.split(",");
            ident = other[0];
            move = other[1];
            //If "prev" was specified, and the first filtered sibling doesn't match, search through the dom
            //starting with the first parent's children, and moving up and back until the match is found or there
            //are no more parents. Does the reverse for "next".
            //Note: If more than one match is found, it will return the closest one. Finding more than match
            //becomes more likely the further it steps up in parents.
            var place = other[1] === "up" ? ":last" : ":first";
            var otherElem = move === "up" ? element.prevAll(ident + ":first") : element.nextAll(ident + ":first");
            if (otherElem.length === 0) {
                var stepOut = element.parent();
                while (stepOut.length !== 0) {
                    var sibling = move === "up" ? stepOut.prev() : stepOut.next();
                    while (sibling.length !== 0) {
                        var otherElement = sibling.find(ident + place);
                        if (otherElement.length !== 0) {
                            return otherElement;
                            }
                        sibling = move === "up" ? sibling.prev() : sibling.next();
                    }
                    stepOut = stepOut.parent();
                }
            }
            else {
                return other[1] === "up" ? element.prevAll(ident + ":first") : element.nextAll(ident + ":first");
            }
        }
        return element;
    };

    this.removeErrors = function(elem) {
        if (elem !== undefined) {
            var element = $("#" + elem);
            var inputs = $("#" + elem).find(":input").filter(":input");
            for (var i = 0; i < inputs.length; i++) {
                $("[id^='" + inputs[i].id + "error']").each(function(index, val) {
                    $(val).remove();
                });
                $("[id^='" + inputs[i].id + "InputGrp']").each(function(index, val) {
                    $(val).remove();
                });
            }
            
            $("[id^='" + element[0].id + "error']").each(function(index, val) {
                val.remove();
            });

            $("[id^='" + element[0].id + "InputGrp']").each(function(index, val) {
                val.remove();
            });

            element.find(".errorMessage").each(function(index, val) {
                val.remove();
            });

            element.find(".invalid").each(function(index, val) {
                $(val).removeClass("invalid");
            });

            element.find(".groupedErrors").each(function(index, val) {
                $(val).empty();
                $(val).css("display", "none");
            });
        }
        else {
            $("body").find(".errorMessage").each(function(index, val) {
            val.remove();
            });

            $("body").find(".invalid").each(function(index, val) {
                $(val).removeClass("invalid");
            });

            $("body").find(".groupedErrors").each(function(index, val) {
                $(val).empty();
                $(val).removeClass("showGroupedErrors");
                $(val).addClass("hideGroupedErrors");
            });

            $("body").find(".inputGroup").each(function(index, val) {
                val.remove();
            });
        }
    }

    var displayHelpText = function(helpOptions) {
        var elem = $(helpOptions.input);
        var helpText = elem.prevUntil(":input").filter(".helptext:first");
        var position = getOtherElem(elem).offset();
        var errorOffsets = getMessageOffset(elem);
        helpText.addClass("showMessage");
        helpText.removeClass("hideMessage");
        var placement = determinePlacement(position, elem, 0, 0, helpText);
        helpText.css('top', placement[1]);
        helpText.css('left', placement[0]);

        elem.data("displayhelptext", "true");

        if (helpOptions.modalId !== null) {
            helpTextScrollModalListener(helpOptions, elem, errorOffsets.width, errorOffsets.height, helpText);
        }
        else {
            $(window).on("scroll", function() {
                placement = determinePlacement(position, elem, errorOffsets.width, errorOffsets.height, helpText);
                helpText.css('top', placement[1]);
                helpText.css('left', placement[0]);
            });
        }
    };

    var monitorChars = function(elem, options, event) {
        var testedArray = [];
        var valid = false;
        var rules = options.type.split(',');
        $.each(rules, function(index, value) {
            var fn = inputTypes[value];
            if (typeof fn === "function") {
                valid = fn.call(this, elem, event);
                testedArray.push(valid);
            }
        });

        if (testedArray.length > 1) {
            for (var i = 0; i < testedArray.length-1; i++) {
                if (!testedArray[i]) {
                    return false;
                }
            }
            return true;
        }
        return testedArray[0];
    };

    /////////////////////////////////////////////////////////////////////////////////////////////
    /*
        Character restriction tests
    */
    ////////////////////////////////////////////////////////////////////////////////////////////

    var inputTypes = {
        numeric: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if ((unicode > 43 && unicode < 47) || (unicode > 47 && unicode < 58)) { //if a number, decimal, comma, or minus
                return true; //disable key press
            }
            return false;
        },
        integer: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if ((unicode !== 45) || (unicode < 48 || unicode > 57)) { //if not a number or minus
                return false; //disable key press
            }
            return true;
        },
        positiveInt: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode < 48 || unicode > 57) { //if not a number
                return false; //disable key press
            }
            return true;
        },
        nonNumeric: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode < 48 || unicode > 57) { //if a number
                return true; //disable key press
            }
            return false;
        },
        alphaNumeric: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if ((unicode > 47 || unicode < 58) && (unicode < 65 || unicode > 90) && (unicode < 97 || unicode > 122)) { //if alpha-numeric
                return true; //disable key press
            }
            return false;
        },
        nonAlphaNumeric: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if ((unicode > 47 || unicode < 58) && (unicode < 65 || unicode > 90) && (unicode < 97 || unicode > 122)) { //if alpha-numeric
                return false;
            }
            return true;
        },
        printable: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode > 31 || unicode < 128) { //if not alpha-numeric
                return true; //disable key press
            }
            return false;
        },
        printableNonNumeric: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if ((unicode > 31 && unicode < 48) || (unicode > 57 && unicode < 128)) { //if not alpha-numeric
                return true; //disable key press
            }
            return false;
        },
        phone: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode === 32 || unicode === 40 || unicode === 41 || unicode === 45 || unicode === 46 || (unicode >= 48 && unicode <= 57)) {
                return true;
            }
            return false;
            //32, 40, 41, 45, 46, 48-57
        },
        shortDate: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode >= 45 && unicode <= 57) {
                return true;
            }
            return false;
        },
        longDate: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if ((unicode < 48 || unicode > 57) && (unicode < 65 || unicode > 90) && (unicode < 97 || unicode > 122) && (unicode !== 46) && (unicode !== 44)) { //if not alpha-numeric or space or period
                return false; //disable key press
            }
            return true;
        }
    };

    /////////////////////////////////////////////////////////////////////////////////////////////
    /*
        Predefined validation rules.
    */
    ////////////////////////////////////////////////////////////////////////////////////////////

    var required = function(obj) {
        if (obj.val().length < 1) {
            return { valid: false, message: "Required field.", width: 100 };
        }
    return { valid: true }
    };

    var dataTypeRules = {
        email: function(obj) {
            var re = new RegExp("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+.[A-Za-z]{2,4}$");
            var isEmail = re.test(obj.val());
            if (obj.val() !== "" && !isEmail) {
                return { valid: isEmail, message: "Not a valid email format.", width: 200 };
            }
            return { valid: true };
        },
        name: function(obj) {
            var re = new RegExp("^([a-zA-z\\s]{4,32})$");
            var isName = re.test(obj.val());
            if (obj.val() !== "" && !isName) {
                return { valid: isName, message: "Not a valid name.", width: 150 };
            }
            return { valid: true };
        },
        phone: function(obj) {
            var re = new RegExp("^\\D?(\\d{3})\\D?\\D?(\\d{3})\\D?(\\d{4})$");
            var isPhone = re.test(obj.val());
            if (obj.val() !== "" && !isPhone) {
                return { valid: isPhone, message: "Not a valid phone number.", width: 200 };
            }
            return { valid: true };
        },
        numeric: function(obj) {
            var re = new RegExp("/[0-9]|\\./");
            var isInt = re.test(obj.val());
            if (obj.val() !== "" && !isInt) {
                return { valid: isInt, message: "Only integers are allowed.", width: 200 };
            }
            return { valid: true };
        },
        zip: function(obj) {
            var re = new RegExp("^\\d{5}$");
            var isZip = re.test(obj.val());
            if (obj.val() !== "" && !isZip) {
                return { valid: isZip, message: "Not a valid zip code.", width: 200 };
            }
            return { valid: true };
        },
        date: function(obj) {
            var re = new RegExp("^(?:(?:(?:0?[13578]|1[02])(\\/|-|\\.)31)\\1|(?:(?:0?[1,3-9]|1[0-2])(\\/|-|\\.)(?:29|30)\\2))(?:(?:1[6-9]|[2-9]\\d)?\\d" +
                "{2})$|^(?:0?2(\\/|-|\\.)29\\3(?:(?:(?:1[6-9]|[2-9]\\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|" +
                "^(?:(?:0?[1-9])|(?:1[0-2]))(\\/|-|\\.)(?:0?[1-9]|1\\d|2[0-8])\\4(?:(?:1[6-9]|[2-9]\\d)?\\d{2})$");
            var isDate = re.test(obj.val());
            if (obj.val() !== "" && !isDate) {
                return { valid: isDate, message: "Not a valid date.", width: 200};
            }
            return { valid: true };
        },
        url: function(obj) {
            var re = new RegExp("^(http|https|ftp)\\://[a-zA-Z0-9\\-\\.]+\\.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?/?([a-zA-Z0-9\\-\\._\\?\\,\\'/\\\\+&amp;%\\$#\\=~])*$");
            var isURL = re.test(obj.val());
            if (obj.val() !== "" && !isURL) {
                return { valid: isURL, message: "Not a valid url.", width: 150};
            }
            return { valid: true };
        },
        /*
        Password matching expression. Password must be at least 8 characters, no more than 40 characters, and must include at least one upper case letter, one lower case letter, and one numeric digit.
        */
        password: function(obj) {
            var re = new RegExp("^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,40}$");
            var isStrong = re.test(obj.val());
            if (obj.val() !== "" && !isStrong) {
                return { valid: isStrong, message: "Password must be at least 8 characters and include both upper and lower case letters and a number.", width: 300};
            }
            return { valid: true };
        }
    };
    return this;
};
