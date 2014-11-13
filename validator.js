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
    this.init = function(events) {
        $(document).on("click", "input, button", function(event) {  //Bind form event listener and create "options" object when an input or button with the "formValidate" class is clicked.
            var target = $(event.currentTarget),
            form = target.parents(".formValidate:first");
            if (form.length > 0 && target.hasClass("validate")) {
                var formOptions = createOptions(form, event);
                formOptions.form = form;
                formOptions.groupErrors = form.data("groupErrors") || null;
                formOptions.callBefore = form.data("beforevalidate") || false;
                formOptions.button = target;
                Object.freeze(formOptions);
                target.prop("disabled", true);
                callBeforeValidate(form, formOptions);
            }
        });

        $(document).on("input", "input", function(event) {      //Bind input event listener on input event. The input itself or its parent must have the "inputValidate" class.
            var target = $(event.currentTarget),
            inputOptions;
            if (!target.hasClass("inputValidate") && (target.data("validateon") === undefined || target.data("validateon") === "input")) {
                var parent = target.parents(".inputValidate:first");
                if (parent !== undefined) {
                    var exclude = parent.data("excludeinputs");
                    if (exclude !== undefined && exclude.indexOf(event.currentTarget.id) === -1) {   //if the parent form has excluded this input from validation, we stop here.
                        var inputOptions = createOptions(target, event);
                        inputOptions.input = event.currentTarget;
                        Object.freeze(inputOptions);
                        validateInput(target, inputOptions);
                    }
                }
            }
            else if (target.hasClass("inputValidate") && (target.data("validateon") === undefined || target.data("validateon") === "input")) {
                var inputOptions = createOptions(target, event);
                inputOptions.input = event.currentTarget;
                Object.freeze(inputOptions);
                validateInput(target, inputOptions);
            }
        });

        $(document).on("keypress", "input", function(event) {   //Bind event listener for the keypress event on an input. Used for restricting character input.
            var target = $(event.currentTarget);
            if (target.data("inputtype") !== undefined) {
                var restrictOptions = {
                    input: event.currentTarget,
                    type: target.data("inputtype")
                };
                var valid = monitorChars(target, restrictOptions, event);
                if (!valid) {
                    event.preventDefault();
                }
            }
        });

        $(document).on("focus", "input", function(event) {  //Help text listener. Will display help text for a given input when focused.
            var target = $(event.currentTarget);
            if (target.hasClass("invalid")) {    //if the input has error messages associated with it, we don't show help text.
                return;
            }
            if (target.prevUntil(":input").filter(".helptext:first").length > 0 && $("[id^='" + target[0].id + "error']").length < 1 && $("#" + target[0].id + "InputGrp").length < 1) {
                var helptext = target.prevUntil(":input").filter(".helptext:first"),
                modal = null;
                if (target.data("modalid") === undefined) {
                    if (target.parents(".formValidate:first").length > 0) {
                        modal = target.parents(".formValidate:first").data("modalId") || null;
                    }
                    else if (target.parents(".inputValidate:first").length > 0) {
                        modal = target.parents(".inputValidate:first").data("modalId") || null;
                    }
                    else {
                        modal = null;
                    }
                }
                else {
                    modal = target.data("modalid");
                }
                var helpOptions = {
                    input: event.currentTarget,
                    modalId: modal,
                    helpText: helptext
                };
                displayHelpText(helpOptions);
            }
        });

        $(document).on("blur", "input", function(event) {   //Remove help text on blur.
            var target = $(event.currentTarget),
            helpText = target.prevUntil(":input").filter(".helptext:first"),
            modal;
            if (target.data("modalid") === undefined) {
                if (target.parents(".formValidate:first").length > 0) {
                    modal = target.parents(".formValidate:first").data("modalId") || null;
                }
                else if (target.parents(".inputValidate:first").length > 0) {
                    modal = target.parents(".inputValidate:first").data("modalId") || null;
                }
                else {
                    modal = null;
                }
            }
            else {
                modal = target.data("modalid");
            }

            helpText.addClass("hideMessage").removeClass("showMessage");
            if (modal !== null) {   //unbind event listeners for the help text spans
                $(document).off("helpTextModalScroll" + target.data("htid"));
            }
           $(document).off("helpTextScroll" + target.data("htid"));
        });

        if (events !== undefined) {     //Bind any passed in events for inputs to listen for.
            $.each(events, function(index, val) {
                try {
                    $(document).on(val, "input", function(event) {
                        var target = $(event.currentTarget),
                        inputOptions;
                        if (!target.hasClass("inputValidate") && target.data("validateon") === val) {
                            var parent = target.parents(".inputValidate:first");
                            if (parent !== undefined) {
                                var exclude = parent.data("excludeinputs");
                                if (exclude !== undefined && exclude.indexOf(event.currentTarget.id) === -1) {
                                    inputOptions = createOptions(target, event);
                                    inputOptions.input = event.currentTarget;
                                    Object.freeze(inputOptions);
                                    validateInput(target, inputOptions);
                                }
                            }
                        }
                        else if (target.hasClass("inputValidate") && target.data("validateon") === val) {
                            inputOptions = createOptions(target, event);
                            inputOptions.input = event.currentTarget;
                            Object.freeze(inputOptions);
                            validateInput(target, inputOptions);
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

    this.validate = function(formElem) {    //Public function for starting off the validation process.
        if (formElem !== undefined) {
            var form;
            if (typeof formElem === "string") {
                form = $(formElem);
            }
            else if (typeof formElem === "object") {
                form = formElem;
            }
            try {
                var button = form.find(".validate"),
                formOptions = createOptions(form, null);
                formOptions.form = form;
                formOptions.groupErrors = form.data("groupErrors") || null;
                formOptions.callBefore = form.data("beforevalidate") || false;
                formOptions.button = button;
                Object.freeze(formOptions);
                button.prop("disabled", true);
                callBeforeValidate(form, formOptions);
            }
            catch (ex) {
                console.log("Could not validate form: " + formElem);
                console.log(ex);
            }
        }
        else {
            console.log("Cannot validate a null form.");
        }
    }

    var callBeforeValidate = function(form, options) {
        if (options.callBefore !== false) {     //Run the "call before" function if it's supplied, and continue validation if true.
            var fn = [window].concat(options.callBefore.split('.')).reduce(function (prev, curr) {
                return (typeof prev === "function" ? prev()[curr] : prev[curr]);
            });
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
            else {
                console.log("The supplied 'call before' function: " + options.callBefore + " could not be found.");
                validateForm(true, form, options);
            }
        }
        else {
            validateForm(true, form, options);
        }
    };

    var validateInput = function(input, options) {  //Where inputs go to be validated and the success function called if supplied.
        var inputArray = buildInputArray($(input));
        validateElement(input, options, inputArray);    //Main function where validation is done.
        finalizeValidation(inputArray, options);        //Checks when the validation is complete if it should call the succes function, sends event, etc.
    };

    this.validateForm = function(continueValidation, form, options) {    //Used as both a callback and internally if no call before function is supplied.
        if (continueValidation) {   //Only continue validating if given the go ahead from the "call before" function.
            if (options.groupErrors !== null) {     //Remove previous grouped validation errors before validating a new input.
                $("#" + options.groupErrors).empty().removeClass("showGroupedErrors").addClass("hideGroupedErrors");
            }

            var inputs = $(form).find(":input").filter(":input"),
            formArray = [],
            rules;
            for (var j = 0; j < inputs.length; j++) {   //Build out the inputArray with the various validation rules
                var inputArray = buildInputArray($(inputs[j]));
                for (var i = 0; i < inputArray.length; i++) {
                    formArray.push(inputArray[i]);
                }
            }

            for (var i = 0; i < inputs.length; i++) {
                validateElement(inputs[i], options, formArray);    //Validate each input element in the form.
            }
            finalizeValidation(formArray, options);
        }
    }

    var buildInputArray = function(elem) {
        var vRules = elem.data("validationrules") || "",
        customRules = elem.data('customrules') || "",
        min = elem.data('min') || "",
        max = elem.data("max") || "",
        match = elem.data("matchfield") || "",
        maxChecked = elem.data("maxchecked") || "",
        minChecked = elem.data("minchecked") || "",
        rulesArray = [],
        inputArray = [],
        inputObj;

        if (elem.attr("data-required") !== undefined) {
            rulesArray.push("required");
        }

        var rules = vRules.split(",");
        if (rules.length > 0 && rules[0] !== "") {
            for (var i = 0; i < rules.length; i++) {
                rulesArray.push(rules[i]);
            }
        }

        rules = customRules.split(",");
        if (rules.length > 0 && rules[0] !== "") {
            for (i = 0; i < rules.length; i++) {
                rulesArray.push(rules[i]);
            }
        }

        if (min.length > 0) {
            rulesArray.push("min");
        }

        if (max.length > 0) {
            rulesArray.push("max");
        }

        if (match.length > 0) {
            rulesArray.push("match");
        }

        if (maxChecked.length > 0) {
            rulesArray.push("maxchecked");
        }

        if (minChecked.length > 0) {
            rulesArray.push("minchecked");
        }

        for (var i = 0; i < rulesArray.length; i++) {
            inputObj = {
                input: elem,
                rule: rulesArray[i],
                valid: "waiting"
            };
            inputArray.push(inputObj);
        }

        return inputArray;
    };

    var validateElement = function(element, options, inputsArray) {      //Starting point for single input validation - reached by both forms and inputs.
        var elem = $(element),
        failedRequired = false, //Determines whether it should continue validation after testing the required functionality.
        vRules = elem.data("validationrules"),  //The predefined rules that are part of this library.
        customRules = elem.data('customrules'), //User defined validation rules.
        isRequired = elem.attr("data-required"),
        minVal = elem.data("min"),
        maxVal = elem.data("max"),
        match = elem.data("matchfield"),
        maxChecked = elem.data("maxchecked"),
        minChecked = elem.data("minchecked"),
        rules,
        tested;

        elem.data("vts", options.time);

        if (isRequired !== undefined || vRules !== undefined || customRules !== undefined || minVal !== undefined || 
            maxVal !== undefined || match !== undefined || maxChecked !== undefined || minChecked !== undefined) { //remove any previous error div from the previous validation attempt.
            removeErrorText(elem);
            getOtherElem(elem).removeClass("invalid");
        }
        elem.data("vid", new Date().getTime());

        if (isRequired !== undefined) {
            if (elem[0].type === "radio") {
                tested = validationRules.requiredGroup(elem);
            }
            else {
                tested = validationRules.requiredInput(elem);
            }
            postValidation(tested, elem, options, "required", inputsArray);
            if (!tested.valid) {
                failedRequired = true;
            }
        }

        //If the input passed the required validation or didn't need it, then continue to the other rules.
        if (!failedRequired) {
            if (minVal !== undefined) {
                tested = validationRules.testMinValue(elem);
                postValidation(tested, elem, options, "min", inputsArray);
            }
            if (maxVal !== undefined) {
                tested = validationRules.testMaxValue(elem);
                postValidation(tested, elem, options, "max", inputsArray);
            }
            if (match !== undefined) {
                tested = validationRules.verifyMatch(elem);
                postValidation(tested, elem, options, "match", inputsArray);
            }
            if (maxChecked !== undefined) {
                tested = validationRules.maxChecked(elem);
                postValidation(tested, elem, options, "maxchecked", inputsArray);
            }
            if (minChecked !== undefined) {
                tested = validationRules.minChecked(elem);
                postValidation(tested, elem, options, "minchecked", inputsArray);
            }
            if (vRules !== undefined) {
                rules = vRules.split(',');
                $.each(rules, function(index, value) {
                    var fn = validationRules[value];
                    if (typeof fn === "function") {
                        tested = fn.call(this, elem);
                        postValidation(tested, elem, options, value, inputsArray);
                    }
                    else {
                        console.log("Could not find library function: " + value + " for element: " + elem);
                        setRuleToNull(elem, inputsArray, rules, value);
                    }
                });
            }
            if (customRules !== undefined) {
                rules = customRules.split(',');
                $.each(rules, function(index, value) {
                    var fn = [window].concat(value.split('.')).reduce(function (prev, curr) {
                        return (typeof prev === "function" ? prev()[curr] : prev[curr]);
                    });
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
                            console.log("Failed to execute custom rule: '" + inputState.rule + "'");
                            console.log(ex);
                            setRuleToNull(elem, inputsArray, rules, value);
                        }
                    }
                    else {  //if the provided function name cannot be found, or isn't a function, then "ignore" as a rule we need to validate against.
                        console.log("Could not find library function: " + value + " for element: " + elem);
                        setRuleToNull(elem, inputsArray, rules, value);
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

    var postValidation = function(tested, elem, options, rule, inputsArray) {
        if (!tested.valid) {
            var errorOffsets = getMessageOffset(elem);
            createErrorMessage(elem, tested, options, rule, errorOffsets.width, errorOffsets.height);
            groupByForm(options, elem, rule);
            groupByInput(options, elem, rule);
        }
        for (var i = 0; i < inputsArray.length; i++) {
            if (elem[0] === inputsArray[i].input[0] && rule === inputsArray[i].rule) {
                inputsArray[i].valid = tested.valid;
                break;
            }
        }
    };
    
    var setRuleToNull = function(elem, inputsArray, rules, value) {
        for (var k = 0; k < inputsArray.length; k++) {
            if (elem[0] === inputsArray[k].input[0] && value === inputsArray[k].rule) {
                inputsArray[k].valid = null;
                break;
            }
        }
    };

    this.customRulesCallback = function(tested, inputState) {
        try {
            if (!tested.valid && inputState.element.data("vts") === inputState.option.time) {    //If validation fails, create the error message element
                var errorOffsets = getMessageOffset(inputState.element);

                createErrorMessage(inputState.element, tested, inputState.option, inputState.rule, errorOffsets.width, errorOffsets.height);
                groupByForm(inputState.option, inputState.element, inputState.rule);
                groupByInput(inputState.option, inputState.element, inputState.rule);
            }
            for (var i = 0; i < inputState.inputArray.length; i++) {
                if (inputState.element[0] === inputState.inputArray[i].input[0] && inputState.rule === inputState.inputArray[i].rule) {
                    inputState.inputArray[i].valid = tested.valid;
                    break;
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
        var numFailed = 0,
        rulesTestedCount = 0;
        for (var i = 0; i < inputArray.length; i++) {
            if (inputArray[i].valid === "waiting") {
                return;
            }
            else if (inputArray[i].valid === false) {
                numFailed++;
                rulesTestedCount++;
            }
            else if (inputArray[i].valid === true) {
                rulesTestedCount++;
            }
        }

        if (options.groupErrors !== undefined && options.groupErrors !== null) {  //set up "highlight" bindings for each grouped error
            var form = options.form;
            if (form.hasClass("highlightErrors")) {
                form.find(":input").each(function(idx, input) {
                    $(input).on("focus", $(input), function() {
                        $("[data-parentinput='" + $(input).data("vid") + "']").each(function(index, val) {
                            $(val).addClass("groupHighlight");
                        });
                    });
                    $(input).on("blur", $(input), function() {
                        $("[data-parentinput='" + $(input).data("vid") + "']").each(function(index, val) {
                            $(val).removeClass("groupHighlight");
                        });
                    });
                });
            }
        }

        if (options.button !== undefined) {   //re-enable the submit button
            options.button.prop("disabled", false);
        }

        $(document).trigger("validated", [{
            type: "validation",
            element: options.form !== undefined ? options.form[0].id : options.input,
            passed: numFailed === 0,
            count: numFailed,
            totalRules: inputArray.length,
            testedRules: rulesTestedCount,
            time: new Date(),
            event: options.event
        }]);

        if (numFailed === 0 && options.success !== null) {       //If the "form" passed validation and doesn't have an action attribute, call the success function if one was supplied.
            var fn = [window].concat(options.success.split('.')).reduce(function (prev, curr) {
                return (typeof prev === "function" ? prev()[curr] : prev[curr]);
            });
            if (typeof fn === "function") {
                try {
                   fn.call(this); 
                }
                catch(ex) {
                    console.log("'Success' function: '" + options.success + "'' failed to execute");
                    console.log(ex);
                }
            }
            else {
                console.log("Could not find successful validation function: '" + options.success + "' for the current form.");
            }
        }
        else if (numFailed === 0 && options.event !== null && options.event.currentTarget !== null && options.input === undefined) {  //We need to programmatically submit the form here - async function will prevent to form action from firing.
            options.event.preventDefault();   //prevent default form sumbit
            options.form[0].submit();       //then call it programmatically.
        }
        else if (numFailed !== 0 && options.event !== null && options.event.currentTarget !== null) {   //If the form failed validation and has an action attribute, prevent the default action of the form.
            options.event.preventDefault();
        }
    };

    var groupByInput = function(options, elem, rule) {
        if (options.group) {
            var toDisplay = getOtherElem(elem);
            if ($("#" + elem.data("vid") + "InputGrp").length === 0) {
                placeGroupErrorDiv(toDisplay, options, elem);
            }
            var errorToMove = $("#" + elem.data("vid") + "error" + rule),
            html = errorToMove.html(),
            span = "<span class='inputGrpErrorSpan'>" + html + "</span></br>";
            $("#" + elem.data("vid") + "InputGrp").append(span);
            errorToMove.remove();
        }
    };

    var placeGroupErrorDiv = function(toDisplay, options, elem) {
        var loc = "right";
        if (options.form !== undefined) {
            loc = options.form.data("location");
        }
        else if (elem.parents(".formValidate:first").hasClass("groupByInput")){
            loc = elem.parents(".formValidate:first").data("location");
        }

        switch (loc) {
            case "right":
                toDisplay.after("<div id='" + elem.data("vid") + "InputGrp' data-parentinput='" + elem.data("vid") + "' class='hInputGroup alignInput'></div>");
                return;
            case "left":
                toDisplay.before("<div id='" + elem.data("vid") + "InputGrp' data-parentinput='" + elem.data("vid") + "' class='hInputGroup alignInput'></div>");
                return;
            case "top":
                toDisplay.before("<div id='" + elem.data("vid") + "InputGrp' data-parentinput='" + elem.data("vid") + "' class='vInputGroup'></div>");
                return;
            case "bottom":
                toDisplay.after("<div id='" + elem.data("vid") + "InputGrp' data-parentinput='" + elem.data("vid") + "' class='vInputGroup'></div>");
                return;
            default:
                toDisplay.after("<div id='" + elem.data("vid") + "InputGrp' data-parentinput='" + elem.data("vid") + "' class='hInputGroup alignInput'></div>");
                return;
        }
    };

    var groupByForm = function(options, input, rule) {
        if (options.groupErrors !== undefined && options.groupErrors !== null) {    //If the errors should be grouped, grab all error divs for the current input and put them in the div.
            $("#" + input.data("vid") + "error" + rule).each(function(index, val) {
                var prefix = $(input).data("errorprefix");
                if (prefix !== undefined) {
                    var text = $(val).html();
                    $(val).html(prefix + ": " + text);
                }
                var html = $(val).html(),
                span = "<span class='errorSpan' id='formGrp" + input.data("vid") + rule + "' data-parentinput='" + input.data("vid") + "'>" + html + "</span>";
                placeErrorSpan(options, input.data("vid"), span, rule);
                $(val).remove();
            });
            var grpContainer = $("#" + options.groupErrors);
            if (!grpContainer.hasClass("showGroupedErrors")) {
                grpContainer.removeClass("hideGroupedErrors").addClass("showGroupedErrors");
            }
        }
    };

    var placeErrorSpan = function(options, inputId, span, rule) {
        var errorSpans = $("#" + options.groupErrors).children(".errorSpan"),
        foundSibling = false;
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
                var inputs = options.form.find(":input"),
                parentInput = $("#" + inputId),
                inputIndex = inputs.index(parentInput);
                if (inputIndex < inputs.length - 1) {
                    for (var i = inputIndex + 1; i < inputs.length; i++) {
                        var siblingSpan = $("#" + options.groupErrors).children("[data-parentinput='" + inputs[i].id + "']");
                        if (siblingSpan.length > 0) {
                            $(span).insertBefore(siblingSpan);
                            var thisSpan = $("#formGrp" + inputId + rule);
                            $("</br>").insertAfter(thisSpan);
                            foundSibling = true;
                            break;
                        }
                    }
                    if (!foundSibling) {
                        $("#" + options.groupErrors).append(span).append("</br>");
                    }
                }
            }
        }
        else {
            $("#" + options.groupErrors).append(span).append("</br>");
        }
    };

    var createErrorMessage = function(element, errorData, options, errorName, offsetWidth, offsetHeight) {
        //Can't pass messageDiv in here because it hasn't been created yet.
        displayErrorText(element, errorData, options, errorName, offsetWidth, offsetHeight);

        var messageDiv = $("#" + element.data("vid") + "error" + errorName);
        if ((element).prevUntil(":input").filter(".helptext:first").length > 0) {   //Remove help text because there's an error being displayed now.
            element.prevUntil(":input").filter(".helptext:first").addClass("hideMessage").removeClass("showMessage");
        }
        if (options.display) {
            displayErrorTextOnHover(options, element, messageDiv, offsetWidth, offsetHeight);
        }
        else if (!options.display && options.modalId === null) {
            adjustTextOnScroll(element, messageDiv, offsetWidth, offsetHeight);
        }
        else if (!options.display && options.modalId !== null) {
            scrollModalListener(options, element, offsetWidth, offsetHeight, messageDiv);
        }
    };

    var displayErrorText = function(element, errorData, options, errorName, offsetWidth, offsetHeight) {
        var toDisplay = getOtherElem(element);
        toDisplay.addClass("invalid");
        var popupId = element.data("vid") + "error" + errorName;
        if ($("#" + popupId).length < 1) {
            var popupDiv = "<div id='" + popupId + "' data-parentinput='" + element.data("vid") + "'></div>";
            toDisplay.parent().append(popupDiv);
            var popup = $("#" + popupId);
            popup.addClass("errorMessage");
            var errorMessage = errorData.message === undefined ? "Validation Error" : errorData.message;
            popup.html(errorMessage).css('width', errorData.width === undefined ? "" : errorData.width);
            setErrorPos(element, offsetWidth, offsetHeight, popup);
            if (options.display) {
                popup.addClass("hideMessage").removeClass("showMessage");
            }
            else {
                popup.addClass("showMessage").removeClass("hideMessage");
            }
        }
    };

    var determinePlacement = function(position, element, offsetWidth, offsetHeight, messageDiv) {
        var location = element.data("location") === undefined ? "right" : element.data("location"),
        offset = getElemOffset(element),
        messageWidth = messageDiv.width(),
        height = messageDiv.height(),
        displayedElem = getOtherElem(element);
        switch (location)   //add all the offsets for a given element to calculate the error message placement
        {
            case "right": 
                return [position.left + displayedElem.width() + offsetWidth + offset.left + 8 - $(window).scrollLeft(), position.top - $(window).scrollTop() - offset.top];
            case "left":
                return [position.left - messageWidth - offsetWidth - offset.left - 8 - $(window).scrollLeft(), position.top - $(window).scrollTop() - offset.top];
            case "top":
                return [position.left + offset.left - $(window).scrollLeft(), position.top - $(window).scrollTop() - 5 - height - offsetHeight - offset.top];
            case "bottom":
                return [position.left + offset.left - $(window).scrollLeft(), position.top - $(window).scrollTop() + displayedElem[0].clientHeight + 8 + offsetHeight + offset.top];
            default:
                return [position.left + displayedElem.width() + offsetWidth + offset.left + 8 - $(window).scrollLeft(), position.top - $(window).scrollTop() - offset.top];
        }
    };

    var removeErrorText = function(element) {
        $("[id^='" + element.data("vid") + "error']").each(function(index, val) {
            $(val).remove();
        });
        $("[id^='" + element.data("vid") + "InputGrp']").each(function(index, val) {
            $(val).remove();
        });
    };

    var setErrorPos = function(element, offsetWidth, offsetHeight, messageDiv) {
        var position = getOtherElem(element).offset(),
        placement = determinePlacement(position, element, offsetWidth, offsetHeight, messageDiv);
        messageDiv.addClass("showMessage").removeClass("hideMessage").css('top', placement[1]).css('left', placement[0]);

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
            messageDiv.addClass("hideMessage").removeClass("showMessage");
        });
    };

    var adjustTextOnScroll = function(element, messageDiv, offsetWidth, offsetHeight) {
        $(window).scroll(function() {
            setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
        });
    };

    var isContainerVisible = function(options, element, offsetWidth, offsetHeight, messageDiv) {  //used to determine if help text spans should be removed if they scroll outside of the modal
        var position = getOtherElem(element).offset(),
        placement = determinePlacement(position, element, offsetWidth, offsetHeight, messageDiv),
        modal = $("#" + options.modalId),
        modaloffset = modal.offset(),
        modalTop = modaloffset.top - $(window).scrollTop(),
        modalBottom = modalTop + modal.height(),
        modalLeft = modaloffset.left - $(window).scrollLeft(),
        modalRight = modalLeft + modal.width();

        if ((modalTop > placement[1]) || (modalBottom < placement[1]) ) {
            return false;
        }

        if ((modalLeft > placement[0]) || (modalRight < placement[0] + messageDiv.width())) {
            return false;
        }
        return true;
    };

    var scrollModalListener = function(options, element, offsetWidth, offsetHeight, messageDiv) {
        if (!isContainerVisible(options, element, offsetWidth, offsetHeight, messageDiv)) {
            messageDiv.addClass("hideMessage").removeClass("showMessage");
        }

        $("#" + options.modalId).on("scroll", function() {
            if (!isContainerVisible(options, element, offsetWidth, offsetHeight, messageDiv)) {
                messageDiv.addClass("hideMessage").removeClass("showMessage");
            }
            else {
                setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
                messageDiv.removeClass("hideMessage").addClass("showMessage");
            }
        });

        $(window).scroll(function() {
            if (!isContainerVisible(options, element, offsetWidth, offsetHeight, messageDiv)) {
                messageDiv.addClass("hideMessage").removeClass("showMessage");
            }
            else {
                setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
                messageDiv.removeClass("hideMessage").addClass("showMessage");
            }

        });
    };

    var getMessageOffset = function(element) {
        var width = 0,
        height = 0;
        if ($("[id^='" + element.data("vid") + "error']").length !== 0) {
            $("[id^='" + element.data("vid") + "error']").each(function(index, val) {
                width += $(val).width() + 5;
                height += $(val).height() + 5;
            });
        }
        return {width: width, height: height};
    };

    var getElemOffset = function(element) {     //gets the user-defined offset for the error messages from the element they are being displayed for.
        return {
            left: element.data("offsetwidth") || 0,
            top: element.data("offsetheight") || 0
        };
    };

    var getOtherElem = function(element) {
        //If the error text should be displayed on a different element, will search through the dom till it finds the specified element.
        var displayOther = element.data("displayon") === undefined ? null : element.data("displayon"),
        other, ident, move;
        if (displayOther !== null) {
            other = displayOther.split(",");
            ident = other[0];
            move = other[1];
            if ($(ident).length === 1) {  //If the "identity" of the other element is an id, or only one class exists in the DOM, then there's no
              return $(ident);            //need to step through everything, we'll just return it here.
            }
            //If "prev" was specified, and the first filtered sibling doesn't match, search through the dom
            //starting with the first parent's children, and moving up and back until the match is found or there
            //are no more parents. Does the reverse for "next".
            //Note: If more than one match is found, it will return the closest one. Finding more than match
            //becomes more likely the further it steps up in parents.
            var place = other[1] === "up" ? ":last" : ":first";
            var otherElem = move === "up" ? element.prevAll(ident + ":first") : element.nextAll(ident + ":first");
            if (otherElem.length === 0) {   //if no immediate ancestor was found, look through the DOM till we find it
                var stepOut = element.parent();
                while (stepOut.length !== 0) {
                    if (stepOut.hasClass(ident.substring(1,ident.length))) {
                        return stepOut;     //return parent
                    }
                    var sibling = move === "up" ? stepOut.prev() : stepOut.next();
                    while (sibling.length !== 0) {
                        if (sibling.hasClass(ident.substring(1,ident.length))) {
                            return sibling;     //return uncle
                        }
                        var otherElement = sibling.find(ident + place);
                        if (otherElement.length !== 0) {
                            return otherElement;    //return cousin
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

    this.removeErrors = function(elem) {  //public function to remove error messages
        if (elem !== undefined) {
            var element;
            if (typeof elem === "string") {
                element = $(elem);
            }
            else if (typeof elem === "object") {
                element = elem;
            }
            try {
                var inputs = element.find(":input").filter(":input");
                for (var i = 0; i < inputs.length; i++) {
                    $("[id^='" + $(inputs[i]).data("vid") + "error']").each(function(index, val) {
                        $(val).remove();
                    });
                    $("[id^='" + $(inputs[i]).data("vid") + "InputGrp']").each(function(index, val) {
                        $(val).remove();
                    });
                }
                
                $("[id^='" + element.data("vid") + "error']").each(function(index, val) {
                    val.remove();
                });

                $("[id^='" + element.data("vid") + "InputGrp']").each(function(index, val) {
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
            catch (ex) {
                console.log("Could not remove errors from the supplied element: " + elem);
                console.log(ex);
            }
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

    var helpTextScrollModalListener = function(options, element, offsetWidth, offsetHeight, messageDiv) {
        if (!isContainerVisible(options, element, offsetWidth, offsetHeight, messageDiv) || element.hasClass("invalid")) {
            messageDiv.addClass("hideMessage").removeClass("showMessage");
        }
        else {
            messageDiv.addClass("showMessage").removeClass("hideMessage");
            setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
        }
    };

    var displayHelpText = function(helpOptions) {   //sets up event listeners for help text when the window/modal is scrolled
        var elem = $(helpOptions.input),
        helpText = elem.prevUntil(":input").filter(".helptext:first"),
        position = getOtherElem(elem).offset(),
        errorOffsets = getMessageOffset(elem);
        helpText.addClass("showMessage").removeClass("hideMessage");
        var placement = determinePlacement(position, elem, 0, 0, helpText);
        helpText.css('top', placement[1]).css('left', placement[0]);

        elem.data("htid", new Date().getTime());

        if (helpOptions.modalId !== null) {
            $(document).on("helpTextModalScroll" + elem.data("htid"), function() {
                helpTextScrollModalListener(helpOptions, elem, errorOffsets.width, errorOffsets.height, helpText);
            });
            $("#" + helpOptions.modalId).on("scroll", function() {
                $(document).trigger("helpTextModalScroll" + elem.data("htid"), [{}]);
            });
        }
        $(document).on("helpTextScroll" + elem.data("htid"), function() {
            var placement = determinePlacement(position, elem, errorOffsets.width, errorOffsets.height, helpText);
            helpText.css('top', placement[1]).css('left', placement[0]);
        });
        $(window).on("scroll", function() {
            $(document).trigger("helpTextScroll" + elem.data("htid"), [{}]);
        });
    };

    var monitorChars = function(elem, options, event) {   //tests input characters before allowing event to continue
        var valid = false,
        rules = options.type.split(','),
        testedArray = [];
        $.each(rules, function(index, value) {
            var fn = inputTypes[value];
            if (typeof fn === "function") {
                try {
                        valid = fn.call(this, elem, event);
                        testedArray.push(valid);
                }
                catch(ex) {
                    console.log("The supplied character restriction type: '" + value + "' could not be executed.");
                    console.log(ex);
                }
            }
            else {
                console.log("The supplied character restriction type: '" + value + "' is not an acceptable type.");
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
        else if (testedArray.length === 1) {
          return testedArray[0];
        }
        return true;
    };
    
    var createOptions = function(elem, event) {
        options = {
            display: elem.hasClass("hover"),
            success: elem.data("formaction") || elem.data("inputaction") || null,
            modalId: elem.data("modalid") || null,
            group: elem.hasClass("groupByInput") === false ? elem.parents(".formValidate:first").hasClass("groupByInput") : elem.hasClass("groupByInput"),
            time: new Date().getTime(),
            event: event
        };
        return options;
    };

    /////////////////////////////////////////////////////////////////////////////////////////////
    /*
        Character restriction tests
    */
    ////////////////////////////////////////////////////////////////////////////////////////////
    var inputTypes = {
        numeric: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode === 8 || (unicode > 43 && unicode < 47) || (unicode > 47 && unicode < 58)) { //if a number, decimal, comma, or minus
                return true;
            }
            return false;
        },
        integer: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode === 8 || unicode !== 45 || (unicode < 48 || unicode > 57)) { //if not a number or minus
                return false; //disable key press
            }
            return true;
        },
        positiveInt: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode === 8 || (unicode < 48 || unicode > 57)) { //if not a number
                return false; //disable key press
            }
            return true;
        },
        nonNumeric: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode < 48 || unicode > 57) { //if not a number
                return true;
            }
            return false;
        },
        alphaNumeric: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode === 8 || (unicode > 47 && unicode < 58) || (unicode > 64 && unicode < 91) || (unicode > 96 && unicode < 123)) { //if alpha-numeric
                return true;
            }
            return false;
        },
        nonAlphaNumeric: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if ((unicode > 47 && unicode < 58) || (unicode > 64 && unicode < 91) || (unicode > 96 && unicode < 123)) { //if alpha-numeric
                return false; //disable key press
            }
            return true;
        },
        printable: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode === 8 || (unicode > 31 && unicode < 128)) {
                return true;
            }
            return false;
        },
        printableNonNumeric: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode === 8 || (unicode > 31 && unicode < 48) || (unicode > 57 && unicode < 128)) {
                return true;
            }
            return false;
        },
        phone: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode === 8 || unicode === 32 || unicode === 40 || unicode === 41 || unicode === 45 || unicode === 46 || (unicode >= 48 && unicode <= 57)) {
                return true;
            }
            return false;
        },
        shortDate: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode === 8 || (unicode >= 45 && unicode <= 57)) {
                return true;
            }
            return false;
        },
        longDate: function(obj, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            if (unicode === 8 || (unicode < 48 || unicode > 57) && (unicode < 65 || unicode > 90) && (unicode < 97 || unicode > 122) && (unicode !== 46) && (unicode !== 44)) { //if not alpha-numeric or space or period
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
    var validationRules = {
        requiredInput: function(obj) {
            var re = new RegExp("^\\s*$");
            var isBlank = re.test(obj.val());
            if (obj.val().length < 1 || isBlank) {
               return { valid: false, message: "Required field.", width: 100 };
            }
            return { valid: true };
        },
        requiredGroup: function(obj) {
            if (obj.attr("name")) {
                var grpName = obj.attr("name");
                var selected = $("input[name=" + grpName + "]:checked").val();
                if (selected === undefined) {
                    return { valid: false, message: "You must select an option.", width: 175 };
                }
                return { valid: true };
            }
            return { valid: false, message: "This input has no identifying name." };
        },
        testMinValue: function(obj) {
            var minVal = obj.data("min");
            if (parseInt(minVal) > parseInt(obj.val())) {
                return { valid: false, message: "Minimum allowed value: " + minVal, width: 175 };
            }
            else if (!parseInt(obj.val())) {
                return { valid: false, message: "The value entered is not a number.", width: 200 };
            }
            return { valid: true };
        },
        testMaxValue: function(obj) {
            var maxVal = obj.data("max");
            if (parseInt(maxVal) < parseInt(obj.val())) {
                return { valid: false, message: "Maximum allowed value: " + maxVal, width: 175 };
            }
            else if (!parseInt(obj.val())) {
                return { valid: false, message: "The value entered is not a number.", width: 200 };
            }
            return { valid: true };
        },
        maxChecked: function(obj) {
            var maxNum = obj.data("maxchecked");
            if (obj.data("checkboxgroup")) {
                var grpName = obj.data("checkboxgroup");
                var selected = $("input[data-checkboxgroup=" + grpName + "]:checked");
                if (selected.length > maxNum) {
                    return { valid: false, message: "You cannot select more than " + maxNum + " option(s).", width: 250 };
                }
                return { valid: true };
            }
            return { valid: true };
        },
        minChecked: function(obj) {
            var minNum = obj.data("minchecked");
            if (obj.data("checkboxgroup")) {
                var grpName = obj.data("checkboxgroup");
                var selected = $("input[data-checkboxgroup=" + grpName + "]:checked");
                if (selected.length < minNum) {
                    return { valid: false, message: "You must select at least " + minNum + " option(s).", width: 250 };
                }
                return { valid: true };
            }
            return { valid: true };
        },
        verifyMatch: function(obj) {
            var toMatch = $("#" + obj.data("matchfield"));
            if (obj.val() === toMatch.val()) {
                return { valid: true };
            }
            return { valid: false, message: "Passwords must match.", width: 175 };
        },
        email: function(obj) {
            var re = new RegExp("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+.[A-Za-z]{2,4}$");
            return validationRules.regexTester(obj, re, "Not a valid email format.", 200);
        },
        name: function(obj) {
            var re = new RegExp("^([a-zA-z\\s]{4,32})$");
            return validationRules.regexTester(obj, re, "Not a valid name.", 200);
        },
        ssn: function(obj) {
            var re = new RegExp("^(?!000)([0-6]\\d{2}|7([0-6]\\d|7[012]))([ -]?)(?!00)\\d\\d\\3(?!0000)\\d{4}$");
            return validationRules.regexTester(obj, re, "Not a valid social security number.", 200);
        },
        uscurrency: function(obj) {
            var re = new RegExp("^(\\$|)([1-9]\\d{0,2}(\\,\\d{3})*|([1-9]\\d*))(\\.\\d{2})?$");
            return validationRules.regexTester(obj, re, "Not a valid amount.", 200);
        },
        phone: function(obj) {
            var re = new RegExp("^\\D?(\\d{3})\\D?\\D?(\\d{3})\\D?(\\d{4})$");
            return validationRules.regexTester(obj, re, "Not a valid phone number.", 200);
        },
        address: function(obj) {
            var re = new RegExp("^\\d+\\s?\\w+\\s?\\w+\\s?\\w+$");
            return validationRules.regexTester(obj, re, "Not a street address.", 200);
        },
        numeric: function(obj) {
            var re = new RegExp("/[0-9]|\\./");
            return validationRules.regexTester(obj, re, "Only digits are allowed.", 200);
        },
        zip: function(obj) {
            var re = new RegExp("^\\d{5}$");
            return validationRules.regexTester(obj, re, "Not a valid zip code.", 200);
        },
        date: function(obj) {
            var re = new RegExp("^(?:(?:(?:0?[13578]|1[02])(\\/|-|\\.)31)\\1|(?:(?:0?[1,3-9]|1[0-2])(\\/|-|\\.)(?:29|30)\\2))(?:(?:1[6-9]|[2-9]\\d)?\\d" +
                "{2})$|^(?:0?2(\\/|-|\\.)29\\3(?:(?:(?:1[6-9]|[2-9]\\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|" +
                "^(?:(?:0?[1-9])|(?:1[0-2]))(\\/|-|\\.)(?:0?[1-9]|1\\d|2[0-8])\\4(?:(?:1[6-9]|[2-9]\\d)?\\d{2})$");
            return validationRules.regexTester(obj, re, "Not a valid date.", 200);
        },
        url: function(obj) {
            var re = new RegExp("^(http|https|ftp)\\://[a-zA-Z0-9\\-\\.]+\\.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?/?([a-zA-Z0-9\\-\\._\\?\\,\\'/\\\\+&amp;%\\$#\\=~])*$");
            return validationRules.regexTester(obj, re, "Not a valid url.", 200);
        },
        /*
        Password matching expression. Password must be at least 8 characters, no more than 40 characters, and must include at least one upper case letter, one lower case letter, and one digit.
        */
        password: function(obj) {
            var re = new RegExp("^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,40}$");
            return validationRules.regexTester(obj, re, "Password must be at least 8 characters and include both upper and lower case letters and a number.", 300);
        },
        regexTester: function(obj, regEx, message, width) {
            var isValid = regEx.test(obj.val());
            if (obj.val() !== "" && !isValid) {
                return {valid: isValid, message: message, width: width};
            }
            return {valid: true};
        }
    };
    return this;
};
