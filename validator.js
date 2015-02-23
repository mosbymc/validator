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
                formOptions.groupErrors = form.data("grouperrors") || null;
                formOptions.callBefore = form.data("beforevalidate") || false;
                formOptions.button = target;
                target.prop("disabled", true);
                callBeforeValidate(form, formOptions);
            }
        });

        $(document).on("input", "input", function(event) {      //Bind input event listener on input event. The input itself or its parent must have the "inputValidate" class.
            var target = $(event.currentTarget),
            inputOptions;
            if ((target.hasClass("inputValidate") || target.parents(".inputValidate:first")) && (target.data("validateon") === undefined || target.data("validateon") === "input")) {
                if (target.parents(".inputValidate:first").data("excludeinputs") !== undefined && target.parents(".inputValidate:first").data("excludeinputs").indexOf(event.currentTarget.id) !== -1) {
                    return;
                }
                inputOptions = createOptions(target, event);
                inputOptions.input = event.currentTarget;
                validateInput(target, inputOptions);
            }
        });

        $(document).on("keypress", "input", function(event) {   //Bind event listener for the keypress event on an input. Used for restricting character input.
            var target = $(event.currentTarget);
            if (target.data("inputtype") !== undefined) {
                monitorChars(target, target.data("inputtype"), event);
            }
        });

        $(document).on("focus", "input", function(event) {  //Help text listener. Will display help text for a given input when focused.
            var target = $(event.currentTarget);
            if (target.hasClass("invalid")) {    //if the input has error messages associated with it, we don't show help text.
                return;
            }
            if (target.prevUntil("input").filter(".helptext:first").length > 0 && $("[id^='" + target[0].id + "error']").length < 1 && $("#" + target[0].id + "InputGrp").length < 1) {
                var modal = target.parents(".formValidate:first").data("modalId") || target.parents(".inputValidate:first").data("modalId") || target.data("modalid") || null;
                displayHelpText(target, modal);

                target.one("blur", function(event) {
                    var helpText = target.prevUntil("input").filter(".helptext:first");
                    helpText.addClass("hideMessage").removeClass("showMessage");
                    if (modal !== null) {   //unbind event listeners for the help text spans
                        $(document).off("helpTextModalScroll" + target.data("htid"));
                    }
                   $(document).off("helpTextScroll" + target.data("htid"));
                });
            }
        });

        if (events !== undefined && typeof events === 'array') {     //Bind any passed in events for inputs to listen for.
            $.each(events, function(index, val) {
                try {
                    $(document).on(val, "input", function(event) {
                        var target = $(event.currentTarget),
                        inputOptions;
                        if ((target.hasClass("inputValidate") || target.parents(".inputValidate:first")) && target.data("validateon") === val) {
                            if (target.parents(".inputValidate:first").data("excludeinputs") !== undefined && target.parents(".inputValidate:first").data("excludeinputs").indexOf(event.currentTarget.id) !== -1) {
                                return;
                            }
                            inputOptions = createOptions(target, event);
                            inputOptions.input = event.currentTarget;
                            validateInput(target, inputOptions);
                        }
                    });
                }
                catch(ex) {
                    console.log("Could not bind forms to event: '" + val + "'\n" + ex);
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
                formOptions.groupErrors = form.data("grouperrors") || null;
                formOptions.callBefore = form.data("beforevalidate") || false;
                formOptions.button = button;
                button.prop("disabled", true);
                callBeforeValidate(form, formOptions);
            }
            catch (ex) {
                console.log("Could not validate form: " + formElem + "\n" + ex);
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
                    fn.call(this, form, Object.freeze(options), validateForm);
                }
                catch (ex) {
                    console.log("'Call before' function: '" + options.callBefore + "'' failed to execute\n" + ex);
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
        $(options.input).removeData("validationdone").removeAttr("validationdone");

        var inputArray = buildInputArray($(input));
        validateElement(input, options, inputArray);    //Main function where validation is done.

        if ($(options.input).data("validationdone") !== undefined && $(options.input).data("validationdone")) {
            return;
        }
        else {
            finalizeValidation(inputArray, options);    //Checks when the validation is complete if it should call the succes function, sends event, etc.
        }
    };

    this.validateForm = function(continueValidation, form, options) {    //Used as both a callback and internally if no call before function is supplied.
        $(options.form).removeData("validationdone").removeAttr("validationdone");

        if (continueValidation) {   //Only continue validating if given the go ahead from the "call before" function.
            if (options.groupErrors !== null) {     //Remove previous grouped validation errors before validating a new input.
                $("#" + options.groupErrors).find(".errorSpan").remove();
                $("#" + options.groupErrors).find("br").remove();
            }

            var inputs = $(form).find("input"),
            formArray = [];
            for (var j = 0, length = inputs.length; j < length; j++) {   //Build out the inputArray with the various validation rules
                var inputArray = buildInputArray($(inputs[j]));
                formArray = formArray.concat(inputArray);
            }

            for (var i = 0, length = inputs.length; i < length; i++) {
                validateElement(inputs[i], options, formArray);    //Validate each input element in the form.
            }

            if ($(options.form).data("validationdone") !== undefined && $(options.form).data("validationdone")) {
                return;
            }
            else {
                finalizeValidation(formArray, options);    //Checks when the validation is complete if it should call the succes function, sends event, etc.
            }
        }
    }

    var buildInputArray = function(elem) {
        var vRules = elem.data("validationrules") || "",
        customRules = elem.data('customrules') || "",
        rulesArray = [],
        inputArray = [],
        inputObj;

        if (elem.attr("data-required") !== undefined) {
            rulesArray.push("required");
        }

        var rules = vRules.split(",").concat(customRules.split(","));
        for (var i = 0, length = rules.length; i < length; i++) {
            if (rules[i] !== "") {
                rulesArray.push(rules[i]);
            }
        }

        !elem.data("min") ? false : rulesArray.push("min");
        !elem.data("max") ? false : rulesArray.push("max");
        !elem.data("matchfield") ? false : rulesArray.push("matchfield");
        !elem.data("maxchecked") ? false : rulesArray.push("maxchecked");
        !elem.data("minchecked") ? false : rulesArray.push("minchecked");

        for (var i = 0, length = rulesArray.length; i < length; i++) {
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
        rules,
        tested;

        elem.data("vts", options.time);

        if (elem.attr("data-required") !== undefined || vRules !== undefined || customRules !== undefined || elem.data("min") !== undefined || elem.data("max") !== undefined ||
            elem.data("matchfield") !== undefined || elem.data("maxchecked") !== undefined || elem.data("minchecked") !== undefined) { //remove any previous error div from the previous validation attempt.
            removeErrorText(elem);
            getOtherElem(elem).removeClass("invalid");
        }
        elem.data("vid", new Date().getTime());

        if (elem.attr("data-required") !== undefined) {
            if (elem[0].type === "radio" || elem[0].type === "checkbox") {
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
            if (!!elem.data("min")) {
                tested = validationRules.testMinValue(elem);
                postValidation(tested, elem, options, "min", inputsArray);
            }
            if (!!elem.data("max")) {
                tested = validationRules.testMaxValue(elem);
                postValidation(tested, elem, options, "max", inputsArray);
            }
            if (!!elem.data("matchfield")) {
                tested = validationRules.verifyMatch(elem);
                postValidation(tested, elem, options, "match", inputsArray);
            }
            if (!!elem.data("maxchecked")) {
                tested = validationRules.maxChecked(elem);
                postValidation(tested, elem, options, "maxchecked", inputsArray);
            }
            if (!!elem.data("minchecked")) {
                tested = validationRules.minChecked(elem);
                postValidation(tested, elem, options, "minchecked", inputsArray);
            }
            if (!!vRules) {
                rules = vRules.split(',');
                $.each(rules, function(index, value) {
                    var fn = validationRules[value];
                    if (typeof fn === "function") {
                        tested = fn.call(this, elem);
                        postValidation(tested, elem, options, value, inputsArray);
                    }
                    else {
                        console.log("Could not find library function: " + value + " for element: " + elem);
                        setRuleStatus(elem, inputsArray, value, null);
                    }
                });
            }
            if (!!customRules) {
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
                            console.log("Failed to execute custom rule: '" + inputState.rule + "'\n" + ex);
                            setRuleStatus(elem, inputsArray, value, null);
                        }
                    }
                    else {  //if the provided function name cannot be found, or isn't a function, then "ignore" as a rule we need to validate against.
                        console.log("Could not find library function: " + value + " for element: " + elem);
                        setRuleStatus(elem, inputsArray, value, null);
                    }
                });
            }
        }
        else {
            for (var k = 0, length = inputsArray.length; k < length; k++) {
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
        setRuleStatus(elem, inputsArray, rule, tested.valid);
    };

    var setRuleStatus = function(elem, inputsArray, value, status) {
        for (var k = 0, length = inputsArray.length; k < length; k++) {
            if (elem[0] === inputsArray[k].input[0] && value === inputsArray[k].rule) {
                inputsArray[k].valid = status;
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
            setRuleStatus(inputState.element, inputState.inputArray, inputState.rule, tested.valid);
            finalizeValidation(inputState.inputArray, inputState.option);
        }
        catch(ex) {
            console.log("Returned parameters from custom validation rule: '" + inputState.rule + "', are not in the correct format.\n" + ex);
            inputState.option.button.prop("disabled", false);
        }
    }

    var finalizeValidation = function(inputArray, options) {
        var element = options.form === undefined ? $(options.input) : $(options.form);
        if (element.data("validationdone") !== undefined && element.data("validationdone")) {
            return;
        }
        
        var numFailed = 0,
        rulesTestedCount = 0;
        for (var i = 0, length = inputArray.length; i < length; i++) {
            if (inputArray[i].valid === "waiting") {
                return;     //if there are any inputs still waiting, get out - validation isn't done yet.
            }
            else if (inputArray[i].valid === false) {
                numFailed++;
                rulesTestedCount++;
            }
            else if (inputArray[i].valid === true) {
                rulesTestedCount++;
            }
        }
        
        element.data("validationdone", true);

        if (options.groupErrors !== undefined && options.groupErrors !== null) {  //set up "highlight" bindings for each grouped error
            if (options.form.hasClass("highlightErrors")) {
                $.each(inputArray, function(index, val) {
                    if (val.valid === false) {
                        $(val.input).on("focus", function() {
                            $("[id='formGrp" + val.input.data("vid") + val.rule + "']").addClass("groupHighlight");
                        });
                        $(val.input).on("blur", function() {
                            $("[id='formGrp" + val.input.data("vid") + val.rule + "']").removeClass("groupHighlight");
                        });
                    }
                });
            }
        }

        if (options.button !== undefined) {   //re-enable the submit button
            options.button.prop("disabled", false);
        }

        $(document).trigger("validated", [{
            type: options.form === undefined ? "input validation" : "form validation",
            element: options.form !== undefined ? options.form[0].id : options.input,
            passed: numFailed === 0,
            count: numFailed,
            totalRules: inputArray.length,
            testedRules: rulesTestedCount,
            time: options.time,
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
                    console.log("'Success' function: '" + options.success + "'' failed to execute\n" + ex);
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
            if ($("#" + elem.data("vid") + "InputGrp").length === 0) {
                placeGroupErrorDiv(getOtherElem(elem), options, elem);
            }
            var errorToMove = $("#" + elem.data("vid") + "error" + rule),
            html = errorToMove.html(),
            span = "<span class='inputGrpErrorSpan'>" + html + "</span></br>";
            $("#" + elem.data("vid") + "InputGrp").append(span);
            errorToMove.remove();
        }
    };

    var placeGroupErrorDiv = function(toDisplay, options, elem) {
        var loc;
        if (options.form !== undefined) {
            loc = options.form.data("location") || "right";
        }
        else if (elem.parents(".formValidate:first").hasClass("groupByInput")){
            loc = elem.parents(".formValidate:first").data("location") || "right";
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
        }
    };

    var groupByForm = function(options, input, rule) {
        if (options.groupErrors !== undefined && options.groupErrors !== null) {    //If the errors should be grouped, grab all error divs for the current input and put them in the div.
            $("#" + input.data("vid") + "error" + rule).each(function(index, val) {
                var prefix = $(input).data("errorprefix");
                if (prefix !== undefined) {
                    $(val).html(prefix + ": " + $(val).html());
                }
                var span = "<span class='errorSpan' id='formGrp" + input.data("vid") + rule + "' data-parentinput='" + input.data("vid") + "'>" + $(val).html() + "</span>";
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
                    $("</br>").insertAfter($("#formGrp" + inputId + rule));
                    foundSibling = true;
                    return false;
                }
            });
            if (!foundSibling) {
                var inputs = options.form.find("input"),
                parentInput = $("#" + inputId),
                inputIndex = inputs.index(parentInput);
                if (inputIndex < inputs.length - 1) {
                    for (var i = inputIndex + 1; i < inputs.length; i++) {
                        var siblingSpan = $("#" + options.groupErrors).children("[data-parentinput='" + inputs[i].id + "']");
                        if (siblingSpan.length > 0) {
                            $(span).insertBefore(siblingSpan);
                            $("</br>").insertAfter($("#formGrp" + inputId + rule));
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
            $(window).scroll(function() {
                setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
            });
        }
        else if (!options.display && options.modalId !== null) {
            scrollModalListener(options.modalId, element, offsetWidth, offsetHeight, messageDiv);
        }
    };

    var displayErrorText = function(element, errorData, options, errorName, offsetWidth, offsetHeight) {
        var toDisplay = getOtherElem(element);
        toDisplay.addClass("invalid");
        var popupId = element.data("vid") + "error" + errorName;
        if ($("#" + popupId).length < 1) {
            toDisplay.parent().append("<div id='" + popupId + "' data-parentinput='" + element.data("vid") + "'></div>");
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
        offset = getElemOffset(element);
        switch (location)   //add all the offsets for a given element to calculate the error message placement
        {
            case "right": 
                return [position.left + getOtherElem(element).width() + offsetWidth + offset.left + 8 - $(window).scrollLeft(), position.top - $(window).scrollTop() - offset.top];
            case "left":
                return [position.left - messageDiv.width() - offsetWidth - offset.left - 8 - $(window).scrollLeft(), position.top - $(window).scrollTop() - offset.top];
            case "top":
                return [position.left + offset.left - $(window).scrollLeft(), position.top - $(window).scrollTop() - 5 - messageDiv.height() - offsetHeight - offset.top];
            case "bottom":
                return [position.left + offset.left - $(window).scrollLeft(), position.top - $(window).scrollTop() + getOtherElem(element)[0].clientHeight + 8 + offsetHeight + offset.top];
        }
    };

    var removeErrorText = function(element) {
        $("[id^='" + element.data("vid") + "']").each(function(index, val) {
            $(val).remove();
        });
    };

    var setErrorPos = function(element, offsetWidth, offsetHeight, messageDiv) {
        var placement = determinePlacement(getOtherElem(element).offset(), element, offsetWidth, offsetHeight, messageDiv);
        messageDiv.addClass("showMessage").removeClass("hideMessage").css('top', placement[1]).css('left', placement[0]);
    };

    var displayErrorTextOnHover = function(options, element, messageDiv, offsetWidth, offsetHeight) {
        var toDisplay = getOtherElem(element);
        toDisplay.bind("mouseover", function () {
            if (options.modalId !== null) {
                if (isContainerVisible(options.modalId, element, offsetWidth, offsetHeight, messageDiv)) {
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

    var isContainerVisible = function(modalId, element, offsetWidth, offsetHeight, messageDiv) {  //used to determine if help text spans should be removed if they scroll outside of the modal
        var placement = determinePlacement(getOtherElem(element).offset(), element, offsetWidth, offsetHeight, messageDiv),
        modal = $("#" + modalId),
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

    var scrollModalListener = function(modalId, element, offsetWidth, offsetHeight, messageDiv) {
        if (!isContainerVisible(modalId, element, offsetWidth, offsetHeight, messageDiv)) {
            messageDiv.addClass("hideMessage").removeClass("showMessage");
        }

        $("#" + options.modalId).on("scroll", function() {
            if (!isContainerVisible(modalId, element, offsetWidth, offsetHeight, messageDiv)) {
                messageDiv.addClass("hideMessage").removeClass("showMessage");
            }
            else {
                setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
                messageDiv.removeClass("hideMessage").addClass("showMessage");
            }
        });

        $(window).scroll(function() {
            if (!isContainerVisible(modalId, element, offsetWidth, offsetHeight, messageDiv)) {
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
        $("[id^='" + element.data("vid") + "error']").each(function(index, val) {
            width += $(val).width() + 5;
            height += $(val).height() + 5;
        });
        return {width: width, height: height};
    };

    var getElemOffset = function(element) {     //gets the user-defined offset for the error messages from the element they are being displayed for.
        return {
            left: parseInt(element.data("offsetwidth")) || 0,
            top: parseInt(element.data("offsetheight")) || 0
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
        var element;
        if (elem !== undefined) {
            if (typeof elem === "string") {
                element = $(elem);
            }
            else if (typeof elem === "object") {
                element = elem;
            }
        }
        else {
            element = $("body");
        }
        try {
            element.find("input").each(function(index, val) {
                $("[id^='" + $(val).data("vid") + "error']").remove();
                $("[id^='" + $(val).data("vid") + "InputGrp']").remove();
            });
            $("[id^='" + element.data("vid") + "']").each(function(index, val) {
                val.remove();
            });
            element.find(".errorMessage").each(function(index, val) {
                val.remove();
            });
            element.find(".invalid").each(function(index, val) {
                $(val).removeClass("invalid");
            });
            element.find(".showGroupedErrors").each(function(index, val) {
                $(val).empty().removeClass("showGroupedErrors").addClass("hideGroupedErrors");
            });
        }
        catch (ex) {
            console.log("Could not remove errors from the supplied element: " + elem + "\n" + ex);
        }
    }

    var helpTextScrollModalListener = function(modalId, element, offsetWidth, offsetHeight, messageDiv) {
        if (!isContainerVisible(modalId, element, offsetWidth, offsetHeight, messageDiv) || element.hasClass("invalid")) {
            messageDiv.addClass("hideMessage").removeClass("showMessage");
        }
        else {
            messageDiv.addClass("showMessage").removeClass("hideMessage");
            setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
        }
    };

    var displayHelpText = function(elem, modalId) {   //sets up event listeners for help text when the window/modal is scrolled
        var helpText = elem.prevUntil("input").filter(".helptext:first"),
        position = getOtherElem(elem).offset(),
        errorOffsets = getMessageOffset(elem);
        helpText.addClass("showMessage").removeClass("hideMessage");
        var placement = determinePlacement(position, elem, 0, 0, helpText);
        helpText.css('top', placement[1]).css('left', placement[0]);

        elem.data("htid", new Date().getTime());

        if (modalId !== null) {
            $(document).on("helpTextModalScroll" + elem.data("htid"), function() {
                helpTextScrollModalListener(modalId, elem, errorOffsets.width, errorOffsets.height, helpText);
            });
            $("#" + modalId).on("scroll", function() {
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

    var monitorChars = function(elem, charRestrictions, event) {   //tests input characters before allowing event to continue
        testedArray = [];
        $.each(charRestrictions.split(','), function(index, value) {
            var fn = inputTypes[value];
            if (typeof fn === "function") {
                try {
                    testedArray.push(fn.call(this, elem, event));
                }
                catch(ex) {
                    console.log("The supplied character restriction type: '" + value + "' could not be executed.\n" + ex);
                }
            }
            else {
                console.log("The supplied character restriction type: '" + value + "' is not an acceptable type.");
            }
        });

        if (testedArray.length > 0) {
            for (var i = 0, length = testedArray.length; i < length; i++) {
                if (!testedArray[i]) {
                    event.preventDefault();
                    break;
                }
            }
        }
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
        inputTypeTester: function(charArray, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            for (var i = 0, length = charArray.length; i < length; i++) {
                if ($.isArray(charArray[i])) {
                    if (unicode > charArray[i][0] && unicode < charArray[i][1]) {
                        return true;
                    }
                }
                else if (unicode === charArray[i]) {
                        return true;
                }
            }
            return false;
        },
        numeric: function(obj, e) {
            return inputTypes.inputTypeTester([8, [43, 47], [47, 58]], e);
        },
        integer: function(obj, e) {
            return inputTypes.inputTypeTester([8, 45, [47, 58]], e);
        },
        positiveInt: function(obj, e) {
            return inputTypes.inputTypeTester([8, [47, 58]], e);
        },
        nonNumeric: function(obj, e) {
            return inputTypes.inputTypeTester([[-1, 48], [57, 128]], e);
        },
        alphaNumeric: function(obj, e) {
            return inputTypes.inputTypeTester([8, [47, 58], [64, 91], [96, 123]], e);
        },
        nonAlphaNumeric: function(obj, e) {
            return inputTypes.inputTypeTester([[-1, 48], [57, 65], [90, 97], [122, 128]], e);
        },
        printable: function(obj, e) {
            return inputTypes.inputTypeTester([8, [31, 128]], e);
        },
        printableNonNumeric: function(obj, e) {
            return inputTypes.inputTypeTester([8, [31, 48], [57, 128]], e);
        },
        phone: function(obj, e) {
            return inputTypes.inputTypeTester([8, 32, 40, 41, 45, 46, [47, 58]], e);
        },
        shortDate: function(obj, e) {
            return inputTypes.inputTypeTester([8, [44, 58]], e);
        },
        longDate: function(obj, e) {
            return inputTypes.inputTypeTester([8, 32, 44, 46, [47, 58], [64, 91], [96, 123]], e);
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
            else if (obj.data("checkboxgroup")) {
                var grpName = obj.data("checkboxgroup");
                if ($("input[data-checkboxgroup=" + grpName + "]:checked").length < 1) {
                    return { valid: false, message: "You must select an option.", width: 175 };
                }
                else {
                    return { valid: true };
                }
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
            return { valid: false, message: "Passwords must match.", width: 200 };
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
