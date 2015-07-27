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
*/
var validator = (function validator($) {
    var validationState = {};
    $(document).on("click", "input, button", function clickHandler(event) {  //Bind form event listener and create "options" object when an input or button with the "formValidate" class is clicked.
        var target = $(event.currentTarget),
        form = target.parents(".formValidate:first");
        if (form.length > 0 && target.hasClass("validate")) {   //ensure that there's at least one input inside the "form" element, and it has the correct class before trying to validate
            var formOptions = createOptions(form, event);
            validationState[formOptions.time] = { options: formOptions };
            callBeforeValidate(form, formOptions);
        }
    });

    $(document).on("keypress", "input", function keypressHandler(event) {   //Bind event listener for the keypress event on an input. Used for restricting character input.
        var target = $(event.currentTarget);
        if (target.data("inputtype") != undefined) {
            monitorChars(target, target.data("inputtype"), event);
        }
    });

    $(document).on("focus", "input", function focusHandler(event) {  //Help text listener. Will display help text for a given input when focused.
        var target = $(event.currentTarget);
        if (!target.hasClass("invalid") && target.prevUntil("input").filter(".helptext:first").length > 0 && $("[id^='" + target.data("vid") + "error']").length < 1 && $("#" + target[0].id + "InputGrp").length < 1) {
            var modal = target.parents(".formValidate:first").data("modalid") || target.parents(".inputValidate:first").data("modalid") || target.data("modalid") || null;
            displayHelpText(target, modal);

            target.one("blur", function blurHandler(event) {
                var helpText = target.prevUntil("input").filter(".helptext:first");
                helpText.addClass("hideMessage").removeClass("showMessage");
                if (modal !== null) $(document).off("helpTextModalScroll" + target.data("htid"));   //unbind event listeners for the help text spans
                $(document).off("helpTextScroll" + target.data("htid"));
            });
        }
    });
    setAdditionalEvents(['input']);

    function setAdditionalEvents(events) {  //listens to the 'input' event by default, others can be passed in by the developer
        if (events && events.constructor === Array) {
            $.each(events, function iterateAdditionalEventsCallback(index, val) {
                $(document).on(val, "input", function additionalEventsHandler(event) {  //handler for each additional event that is passed
                    var target = $(event.currentTarget), 
                        parent = target.parents(".inputValidate:first") ,inputOptions;
                    if ((target.hasClass("inputValidate") || (parent && parent.length > 0)) && 
                        (target.data("validateon") === val || (val === 'input' && target.data("validateon") == undefined))) {
                        if (parent.data("excludeinputs") && parent.data("excludeinputs").indexOf(event.currentTarget.id) !== -1) {
                            return;
                        }
                        inputOptions = createOptions(target, event);
                        validateInput(target, inputOptions);
                    }
                });
            });
        }
    };

    function validate(formElem) {    //Public function for starting off the validation process. Basically does what the 'form event' listener does: creates options object and starts the process
        if (formElem !== undefined) {
            var form = $(formElem);
            try {
                var formOptions = createOptions(form, null);
                validationState[formOptions.time] = { options: formOptions };
                callBeforeValidate(form, formOptions);
            }
            catch (ex) {
                form.find(".validate").prop("disabled", false);
            }
        }
    }

    function callBeforeValidate(form, options) {    //allows the developer to determine at runtime if the form should be validated.
        form.data("vts", options.time);
        options.button.prop("disabled", true);
        if (options.callBefore !== false) {     //Run the "call before" function if it's supplied, and continue validation if true.
            var fn = [window].concat(options.callBefore.split('.')).reduce(function findCallBeforeFunctionCallback(prev, curr) {
                return (typeof prev === "function" ? prev()[curr] : prev[curr]);
            });
            if (typeof fn === "function") fn.call(form, validateForm);
            else validateForm(true, form, options);
        }
        else validateForm(true, form, options);
    }

    function validateInput(input, options) {  //Where inputs go to be validated and the success function called if supplied.
        var inputArray = [];
        inputArray.push(buildInputArray($(input)));
        if (inputArray[0] === null && inputArray.length === 1) return;  //catch potential validation events on inputs with no rules
        validationState[options.time] = { options: options, inputArray: inputArray };
        validateElement(options, inputArray);    //Main function where validation is done.
        finalizeValidation(input);
    }

    function validateForm(continueValidation, form) {    //Used as both a callback and internally if no 'call before validation' function is supplied.
        var options = validationState[form.data("vts")].options;
        if (continueValidation) {   //Only continue validating if given the go ahead from the "call before" function.
            if (options.groupErrors !== null) {     //Remove previous grouped validation errors before validating a new input.
                $("#" + options.groupErrors).find(".errorSpan").remove();
                $("#" + options.groupErrors).find("br").remove();
            }

            var inputs = $(form).find("input, select"),
            formArray = [];
            for (var j = 0, length = inputs.length; j < length; j++) {   //Build out the inputArray with the various validation rules
                var inputArray = buildInputArray($(inputs[j]));
                if (inputArray !== null) formArray = formArray.concat(inputArray);
            }
            validationState[form.data("vts")].inputArray = formArray;
            validateElement(options, formArray);
            finalizeValidation(form);
        }
    }

    function buildInputArray(elem) {    //builds an array of the necessary validation rules for the element that's passed in.
        var inputObj = {};

        if (elem.data("required") === "" && (elem[0].type === "text" || elem[0].type.indexOf("select") !== -1)) inputObj["validator.validationRules.requiredInput"] = "waiting";
        if (elem.data("required") === "" && (elem[0].type === "radio" || elem[0].type === "checkbox")) inputObj["validator.validationRules.requiredGroup"] = "waiting";
        if (elem.data("min")) inputObj["validator.validationRules.testMinValue"] = "waiting";
        if (elem.data("max")) inputObj["validator.validationRules.testMaxValue"] = "waiting";
        if (elem.data("matchfield")) inputObj["validator.validationRules.verifyMatch"] = "waiting";
        if (elem.data("maxchecked")) inputObj["validator.validationRules.maxChecked"] = "waiting";
        if (elem.data("minchecked")) inputObj["validator.validationRules.minChecked"] = "waiting";

        var rules = (elem.data('validationrules') || "").replace(/ /g, "").split(",");
        for (var i = 0; i < rules.length; i++) {
            if (rules[i] !== "") inputObj["validator.validationRules." + rules[i]] = "waiting";
        }
        rules = (elem.data('customrules') || "").replace(/ /g, "").split(",");
        for (var i = 0; i < rules.length; i++) {
            if (rules[i] !== "") inputObj[rules[i]] = "waiting";
        }

        return Object.keys(inputObj).length > 0 ? { element: elem, rules: inputObj } : null;   //only return something for this input if it's actually being validated
    }

    function validateElement(options, inputsArray) {      //Starting point for single input validation - reached by both forms and inputs.
        for (var i = 0, len = inputsArray.length; i < len; i++) {
            var elem = inputsArray[i].element,
            id = performance.now().toString().split(".");   //can't rely on devs giving inputs ids.. need to create our own.

            removeErrorText(elem);
            getOtherElem(elem).removeClass("invalid");
            elem.data("vts", options.time).data("vid", id[1]).attr("vts", options.time);

            var rules = inputsArray[i].rules;
            for (var rule in rules) {
                if (!inputsArray[i].failedRequired) {      //if the input wasn't 'required', or it passed validation for that function, then move on through the array for that input
                    var fn = [window].concat(rule.split('.')).reduce(function findValidationRuleCallback(prev, curr) {
                                return (typeof prev === "function" ? prev()[curr] : prev[curr]);
                            });;
                    if (typeof fn === "function") createContextWrapper(rule, options.time, fn, elem, inputsArray[i]);
                    else setRuleStatus(elem, rule, null);    //if the validator cannot find the supplied function name, then it just gets skipped.
                }
                else setRuleStatus(elem, rule, null); //input failed the required validation and we just need to clear this rule out of the array
            }
        }
    }

    function createContextWrapper(name, time, fn, elem, elemRules) {    //need to make use of closures and scope here to ensure each contextWrapper has its own scope
        var cw = contextWrapper(name, time, fn, elem, function validated(valid, message, width) {
            cw.done.call(cw, {valid: valid, message: message, width: width}); //The custom validation functions will callback to here when they are done validating.
        });
        if (cw.functionName === "validator.validationRules.requiredInput" || cw.functionName === "validator.validationRules.requiredGroup")
            cw.customFunction.call(elem[0], elemRules, cw.validate);
        else cw.customFunction.call(elem[0], cw.validate); //once the contextWrapper is created, call the custom validation function
    }

    function postValidation(tested, elem, options, rule) {
        if (!tested.valid) {
            var errorOffsets = getMessageOffset(elem);
            createErrorMessage(elem, tested, options, rule, errorOffsets.width, errorOffsets.height);
            if (options.group) groupByInput(options, elem, rule);
            else if (options.groupErrors !== undefined && options.groupErrors !== null) groupByForm(options, elem, rule);
        }
        setRuleStatus(elem, rule, tested.valid);
    }

    function setRuleStatus(elem, value, status) {  //sets the status of each validation rule in the array - when none are waiting, we're through validating
        var instance = elem.data("vts"),
            input;
        for (var i = 0, length = validationState[instance].inputArray.length; i < length; i++) {
            input = validationState[instance].inputArray[i];
            if (elem.data("vid") === input.element.data("vid")) {
                input.rules[value] = status;
                break;
            }
        }
    }

    function validationRulesCallback(result) {      //callback for all custom validation rules
        try {
            if ($(this.element).data("vts") === this.timeStamp) {    //If this is the most recent validation instance, go about the clean up.
                postValidation(result, this.element, validationState[this.timeStamp].options, this.functionName);
                finalizeValidation(this.element);
            }
            else delete validationState[this.timeStamp];
        }
        catch(ex) {
            if (validationState[this.timeStamp].options.button)
                validationState[this.timeStamp].options.button.prop("disabled", false);
        }
    }

    function finalizeValidation(element) {  //this is where we check to see if we're done validating, fire the validation event, and call the supplied 'success' function.
        var instance = element.data("vts");
        if (!validationState[instance]) return;
        var vElem = validationState[instance].options.form || $(validationState[instance].options.input),
            numFailed = 0,
            inputArray = validationState[instance].inputArray,
            options = validationState[instance].options;

        for (var i = 0, length = inputArray.length; i < length; i++) {
            for (var rule in inputArray[i].rules) {
                if (inputArray[i].rules[rule] === "waiting") return;
                else if (inputArray[i].rules[rule] === false) numFailed++;
            }
        }

        delete validationState[options.time];   //remove the current instance from the vState object
        if (options.button) options.button.prop("disabled", false);   //re-enable the submit button

        if (!!options.groupErrors && options.form.hasClass("highlightErrors")) {  //set up "highlight" bindings for each grouped errors
            $.each(inputArray, function iterateInputsForGroupingCallback(index, value) {
                $.each(value.rules, function iterateRulesForGroupingCallback(idx, val) {
                    if (val === false) {
                        $(value.element).on("focus", function addGroupHighlightHandler() {
                            $("[id='formGrp" + value.element.data("vid") + idx + "']").addClass("groupHighlight");
                        });
                        $(value.element).on("blur", function removeGroupHighlightHandler() {
                            $("[id='formGrp" + value.element.data("vid") + idx + "']").removeClass("groupHighlight");
                        });
                    }
                });
            });
        }

        $(document).trigger("validated", [{
            type: options.form === undefined ? "input validation" : "form validation",
            element: options.form !== undefined ? options.form[0].id : options.input[0].id,
            succeeded: numFailed === 0,
            event: options.event
        }]);

        if (numFailed === 0 && options.success !== null) {       //If the "form" passed validation and doesn't have an action attribute, call the success function if one was supplied.
            var fn = [window].concat(options.success.split('.')).reduce(function findSuccessFunctionCallback(prev, curr) {
                return (typeof prev === "function" ? prev()[curr] : prev[curr]);
            });
            if (typeof fn === "function") fn.call(options.form ? options.form[0] : options.input[0]);
        }
        else if (numFailed === 0 && options.event !== null && options.event.currentTarget !== null && options.input === undefined) {  //We need to programmatically submit the form here - async function will prevent the form action from firing.
            options.event.preventDefault();   //prevent default form sumbit
            options.form[0].submit();       //then call it programmatically.
        }
        else if (numFailed !== 0 && options.event !== null && options.event.currentTarget !== null) {   //If the form failed validation and has an action attribute, prevent the default action of the form.
            options.event.preventDefault();
        }
    }

    function groupByInput(options, elem, rule) {    //groups all error messages from the validation by input
        if ($("#" + elem.data("vid") + "InputGrp").length === 0) {
            placeGroupErrorDiv(getOtherElem(elem), options, elem);
        }
        var errorToMove = $("#" + elem.data("vid") + "error" + rule.replace( /(:|\.|\[|\]|,)/g, "\\$1" )),
        html = errorToMove.html(),
        span = "<span class='inputGrpErrorSpan'>" + html + "</span></br>";
        $("#" + elem.data("vid") + "InputGrp").append(span);
        errorToMove.remove();
    }

    function placeGroupErrorDiv(toDisplay, options, elem) {
        var loc = elem.hasClass("groupByInput") === false ? elem.parents(".formValidate:first").data("location") || "right"  : elem.data("location") || "right";
        switch (loc) {
            case "right":
                return toDisplay.after("<div id='" + elem.data("vid") + "InputGrp' data-parentinput='" + elem.data("vid") + "' class='hInputGroup alignInput'></div>");
            case "left":
                return toDisplay.before("<div id='" + elem.data("vid") + "InputGrp' data-parentinput='" + elem.data("vid") + "' class='hInputGroup alignInput'></div>");
            case "top":
                return toDisplay.before("<div id='" + elem.data("vid") + "InputGrp' data-parentinput='" + elem.data("vid") + "' class='vInputGroup'></div>");
            case "bottom":
                return toDisplay.after("<div id='" + elem.data("vid") + "InputGrp' data-parentinput='" + elem.data("vid") + "' class='vInputGroup'></div>");
        }
    }

    function groupByForm(options, input, rule) {        //groups the error messages from validation into a DOM element supplied by the data-grouperrors attr.
        $("#" + input.data("vid") + "error" + rule.replace( /(:|\.|\[|\]|,)/g, "\\$1" )).each(function iterateErrorDivsCallback(index, val) {    //Grab all error divs for the current input and put them in the div.
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

    function placeErrorSpan(options, inputId, span, rule) {
        var siblings = $("#" + options.groupErrors).find("[id^='formGrp" + inputId + "']"); //if the current error span has sibling errors for the same input already created, just prepend the new span to them.
        if (siblings.length > 0) {
            $(span).insertBefore(siblings[0]);
            $("</br>").insertAfter($("#formGrp" + inputId + rule.replace( /(:|\.|\[|\]|,)/g, "\\$1" )));
            return;
        }
        var inputs = options.form.find("input"),    //If no sibling was found, get all the inputs in the current form...
        parentInput = inputs.filter(function() {
            return $(this).data("vid") === inputId ? $(this) : false;
        }),
        inputIndex = inputs.index(parentInput); 
        if (inputIndex < inputs.length - 1) {       //...and starting with the next input in the form after the current input, find the next posted error, and prepend the new error span to it.
            for (var i = inputIndex + 1; i < inputs.length; i++) {
                var siblingSpan = $("#" + options.groupErrors).children("[data-parentinput='" + $(inputs[i]).data("vid") + "']");
                if (siblingSpan.length > 0) {
                    $(span).insertBefore(siblingSpan);
                    $("</br>").insertAfter($("#formGrp" + inputId + rule.replace( /(:|\.|\[|\]|,)/g, "\\$1" )));
                    return;
                }
            }
        }
        $("#" + options.groupErrors).append(span).append("</br>");  //if this is the first error span to be placed in the group, just place it.
    }

    function createErrorMessage(element, errorData, options, errorName, offsetWidth, offsetHeight) {
        displayErrorText(element, errorData, options, errorName, offsetWidth, offsetHeight);

        var messageDiv = $("#" + element.data("vid") + "error" + errorName.replace( /(:|\.|\[|\]|,)/g, "\\$1" ));
        if ((element).prevUntil("input").filter(".helptext:first").length > 0) {   //Remove help text because there's an error being displayed now.
            element.prevUntil("input").filter(".helptext:first").addClass("hideMessage").removeClass("showMessage");
        }
        if (options.display) {
            displayErrorTextOnHover(options, element, messageDiv, offsetWidth, offsetHeight);
        }
        else if (!options.display && options.modalId === null) {
            $(window).scroll(function windowScrollHandler() {
                setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
            });
        }
        else if (!options.display && options.modalId !== null) {
            scrollModalListener(options.modalId, element, offsetWidth, offsetHeight, messageDiv);
        }
    }

    function displayErrorText(element, errorData, options, errorName, offsetWidth, offsetHeight) {
        var toDisplay = getOtherElem(element);
        toDisplay.addClass("invalid");
        var popupId = element.data("vid") + "error" + errorName;
        if ($("#" + popupId).length < 1) {
            toDisplay.parent().append("<div id='" + popupId + "' data-parentinput='" + element.data("vid") + "'></div>");
            var popup = $("#" + popupId.replace( /(:|\.|\[|\]|,)/g, "\\$1" ));
            popup.addClass("errorMessage");
            var errorMessage = errorData.message === undefined ? "Validation Error" : errorData.message;
            popup.html(errorMessage).css('width', errorData.width === undefined ? "" : errorData.width);
            setErrorPos(element, offsetWidth, offsetHeight, popup);
            if (options.display) popup.addClass("hideMessage").removeClass("showMessage");
            else popup.addClass("showMessage").removeClass("hideMessage");
        }
    }

    function determinePlacement(position, element, offsetWidth, offsetHeight, messageDiv) {
        var location = element.data("location") === undefined ? "right" : element.data("location"),
        offset = getElemOffset(element);
        switch (location) {  //add all the offsets for a given element to calculate the error message placement
            case "right": 
                return [position.left + getOtherElem(element).width() + offsetWidth + offset.left + 8 - $(window).scrollLeft(), position.top - $(window).scrollTop() - offset.top];
            case "left":
                return [position.left - messageDiv.width() - offsetWidth - offset.left - 8 - $(window).scrollLeft(), position.top - $(window).scrollTop() - offset.top];
            case "top":
                return [position.left + offset.left - $(window).scrollLeft(), position.top - $(window).scrollTop() - 5 - messageDiv.height() - offsetHeight - offset.top];
            case "bottom":
                return [position.left + offset.left - $(window).scrollLeft(), position.top - $(window).scrollTop() + getOtherElem(element)[0].clientHeight + 8 + offsetHeight + offset.top];
        }
    }

    function removeErrorText(element) {
        $("[id^='" + element.data("vid") + "']").each(function removeErrorsCallback(index, val) {
            $(val).remove();
        });
    }

    function setErrorPos(element, offsetWidth, offsetHeight, messageDiv) {
        var placement = determinePlacement(getOtherElem(element).offset(), element, offsetWidth, offsetHeight, messageDiv);
        messageDiv.addClass("showMessage").removeClass("hideMessage").css('top', placement[1]).css('left', placement[0]);
    }

    function displayErrorTextOnHover(options, element, messageDiv, offsetWidth, offsetHeight) {
        var toDisplay = getOtherElem(element);
        toDisplay.bind("mouseover", function mouseOverHandler() {
            if (options.modalId !== null) {
                if (isContainerVisible(options.modalId, element, offsetWidth, offsetHeight, messageDiv)) {
                    setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
                    return;
                }
                return;
            }
            setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
        });

        toDisplay.bind("mouseout", function mouseOutHandler() {
            messageDiv.addClass("hideMessage").removeClass("showMessage");
        });
    }

    function isContainerVisible(modalId, element, offsetWidth, offsetHeight, messageDiv) {  //used to determine if help text spans should be removed if they scroll outside of the modal
        var placement = determinePlacement(getOtherElem(element).offset(), element, offsetWidth, offsetHeight, messageDiv),
        modal = $("#" + modalId),
        modaloffset = modal.offset(),
        modalTop = modaloffset.top - $(window).scrollTop(),
        modalBottom = modalTop + modal.height(),
        modalLeft = modaloffset.left - $(window).scrollLeft(),
        modalRight = modalLeft + modal.width();

        if ((modalTop > placement[1]) || (modalBottom < placement[1]) ) return false;
        if ((modalLeft > placement[0]) || (modalRight < placement[0] + messageDiv.width())) return false;
        return true;
    }

    function scrollModalListener(modalId, element, offsetWidth, offsetHeight, messageDiv) {
        if (!isContainerVisible(modalId, element, offsetWidth, offsetHeight, messageDiv)) {
            messageDiv.addClass("hideMessage").removeClass("showMessage");
        }

        $("#" + modalId).on("scroll", function modalScrollHandler() {
            if (!isContainerVisible(modalId, element, offsetWidth, offsetHeight, messageDiv)) {
                messageDiv.addClass("hideMessage").removeClass("showMessage");
            }
            else {
                setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
                messageDiv.removeClass("hideMessage").addClass("showMessage");
            }
        });

        $(window).scroll(function windowAndModalScrollHandler() {
            if (!isContainerVisible(modalId, element, offsetWidth, offsetHeight, messageDiv)) {
                messageDiv.addClass("hideMessage").removeClass("showMessage");
            }
            else {
                setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
                messageDiv.removeClass("hideMessage").addClass("showMessage");
            }

        });
    }

    function getMessageOffset(element) {
        var width = 0,
        height = 0;
        $("[id^='" + element.data("vid") + "error']").each(function findTotalOffsetCallback(index, val) {
            width += $(val).width() + 5;
            height += $(val).height() + 5;
        });
        return {width: width, height: height};
    }

    function getElemOffset(element) {     //gets the user-defined offset for the error messages from the element they are being displayed for.
        return { left: parseInt(element.data("offsetwidth")) || 0, top: parseInt(element.data("offsetheight")) || 0 };
    }

    function getOtherElem(element) {
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
    }

    function removeErrors(elem) {  //public function to remove error messages
        var element = elem === undefined ? $("body") : $(elem);
        element.find("input").each(function removeGroupedFormErrorsCallback(index, val) {
            $("[id^='" + $(val).data("vid") + "error']").remove();
            $("[id^='" + $(val).data("vid") + "InputGrp']").remove();
        });
        $("[id^='" + element.data("vid") + "']").each(function removeFormErrorsCallback(index, val) {
            val.remove();
        });
        element.find(".errorMessage").each(function removeErrorMessageCallback(index, val) {
            val.remove();
        });
        element.find(".invalid").each(function removeInvalidClassCallback(index, val) {
            $(val).removeClass("invalid");
        });
        element.find(".showGroupedErrors").each(function emptyGroupedErrorsDivCallback(index, val) {
            $(val).empty().removeClass("showGroupedErrors").addClass("hideGroupedErrors");
        });
    }

    function helpTextScrollModalListener(modalId, element, offsetWidth, offsetHeight, messageDiv) {
        if (!isContainerVisible(modalId, element, offsetWidth, offsetHeight, messageDiv) || element.hasClass("invalid")) {
            messageDiv.addClass("hideMessage").removeClass("showMessage");
        }
        else {
            messageDiv.addClass("showMessage").removeClass("hideMessage");
            setErrorPos(element, offsetWidth, offsetHeight, messageDiv);
        }
    }

    function displayHelpText(elem, modalId) {   //sets up event listeners for help text when the window/modal is scrolled
        var helpText = elem.prevUntil("input").filter(".helptext:first"),
        position = getOtherElem(elem).offset(),
        errorOffsets = getMessageOffset(elem);
        helpText.addClass("showMessage").removeClass("hideMessage");
        var placement = determinePlacement(position, elem, 0, 0, helpText);
        helpText.css('top', placement[1]).css('left', placement[0]);

        elem.data("htid", new Date().getTime());    //add a timestamp id so we can bind an event listener to the specific input's help text - keeps all hidden help text from scolling when not shown.

        if (modalId !== null) { //setup up a listener/handler for a modal scroll event
            $(document).on("helpTextModalScroll" + elem.data("htid"), function helptTextModalScrollHandler() {
                helpTextScrollModalListener(modalId, elem, errorOffsets.width, errorOffsets.height, helpText);
            });
            $("#" + modalId).on("scroll", function helpTextModalScrollEventListner() {
                $(document).trigger("helpTextModalScroll" + elem.data("htid"), [{}]);
            });
        }
        $(document).on("helpTextScroll" + elem.data("htid"), function helpTextWindowScrollHandler() {   //set up listener/handler for a window scroll event
            var placement = determinePlacement(position, elem, errorOffsets.width, errorOffsets.height, helpText);
            helpText.css('top', placement[1]).css('left', placement[0]);
        });
        $(window).on("scroll", function helpTextWindowScrollListner() {
            $(document).trigger("helpTextScroll" + elem.data("htid"), [{}]);
        });
    }

    function monitorChars(elem, charRestrictions, event) {   //tests input characters before allowing event to continue
        $.each(charRestrictions.split(','), function iterateCharRestrictionCallback(index, value) {
            var fn = inputTypes[value];
            if (typeof fn === "function") {
                var tested = fn.call(elem, event);
                if (!tested) {
                    event.preventDefault();
                    return false;
                }
            }
        });
    }

    function createOptions(elem, event) {   //creates the options object for the form/input event listeners as well as the public validate function
        var options = {
            display: elem.hasClass("hover"),
            success: elem.data("formaction") || elem.data("inputaction") || null,
            modalId: elem.data("modalid") || null,
            group: elem.hasClass("groupByInput") === false ? elem.parents(".formValidate:first").hasClass("groupByInput") : elem.hasClass("groupByInput"),
            time: new Date().getTime(),
            event: event
        };
        elem[0].tagName === "INPUT" ? options.input = elem : (options.form = elem, options.groupErrors = elem.data("grouperrors") || null, options.callBefore = elem.data("beforevalidate") || false, options.button = elem.find(".validate") || event.currentTarget);
        return options;
    }

    function contextWrapper(name, timeStamp, fn, elem, validated) {     //Returns an object with some "validation state" info + a couple of callbacks.
        return { done: validationRulesCallback, customFunction: fn, functionName: name, element: elem, validate: validated, timeStamp: timeStamp };
    };

    /////////////////////////////////////////////////////////////////////////////////////////////
    /*
        Character restriction tests
    */
    ////////////////////////////////////////////////////////////////////////////////////////////
    var inputTypes = {
        inputTypeTester: function inputTypeTester(charArray, e) {
            var unicode = e.charCode? e.charCode : e.keyCode;
            for (var i = 0, length = charArray.length; i < length; i++) {
                if ($.isArray(charArray[i])) {
                    if (unicode > charArray[i][0] && unicode < charArray[i][1]) return true;
                }
                else if (unicode === charArray[i]) return true;
            }
            return false;
        },
        numeric: function numeric(e) {
            return inputTypes.inputTypeTester([8, [43, 47], [47, 58]], e);
        },
        integer: function integer(e) {
            return inputTypes.inputTypeTester([8, 45, [47, 58]], e);
        },
        positiveInt: function positiveInt(e) {
            return inputTypes.inputTypeTester([8, [47, 58]], e);
        },
        nonNumeric: function nonNumeric(e) {
            return inputTypes.inputTypeTester([[-1, 48], [57, 128]], e);
        },
        alphaNumeric: function alphaNumeric(e) {
            return inputTypes.inputTypeTester([8, [47, 58], [64, 91], [96, 123]], e);
        },
        shortDate: function shortDate(e) {
            return inputTypes.inputTypeTester([8, [44, 58]], e);
        },
        longDate: function longDate(e) {
            return inputTypes.inputTypeTester([8, 32, 44, 46, [47, 58], [64, 91], [96, 123]], e);
        }
    };

    /////////////////////////////////////////////////////////////////////////////////////////////
    /*
        Predefined validation rules.
    */
    ////////////////////////////////////////////////////////////////////////////////////////////
    var validationRules = {
        requiredInput: function requiredInput(rulesObj, callback) {
            var re = new RegExp("^\\s*$");
            var isBlank = re.test($(this).val());
            if ($(this).val().length < 1 || isBlank || $(this).val() === "") {
                rulesObj.failedRequired = true;
                callback(false, "Required field.", 100);
            }
            else callback(true);
        },
        requiredGroup: function requiredGroup(rulesObj, callback) {
            if ($(this).attr("name")) {
                if ($("input[name=" + $(this).attr("name") + "]:checked").val() === undefined) {
                    rulesObj.failedRequired = true;
                    callback(false, "You must select an option.", 175);
                }
                else callback(true);
            }
            else if ($(this).data("checkboxgroup")) {
                if ($("input[data-checkboxgroup=" + $(this).data("checkboxgroup") + "]:checked").length < 1) {
                    rulesObj.failedRequired = true;
                    callback(false, "You must select an option.", 175);
                }
                else callback(true);
            }
            else callback(false, "This input has no identifying attribute.");
        },
        testMinValue: function testMinValue(callback) {
            var minVal = $(this).data("min");
            if (parseInt(minVal) > parseInt($(this).val())) callback(false, "Minimum allowed value: " + minVal, 175);
            else if (!parseInt($(this).val())) callback(false, "The value entered is not a number.", 200);
            else callback(true);
        },
        testMaxValue: function testMaxValue(callback) {
            var maxVal = $(this).data("max");
            if (parseInt(maxVal) < parseInt($(this).val())) callback(false, "Maximum allowed value: " + maxVal, 175);
            else if (!parseInt($(this).val())) callback(false, "The value entered is not a number.", 200);
            else callback(true);
        },
        maxChecked: function maxChecked(callback) {
            var maxNum = $(this).data("maxchecked");
            if ($(this).data("checkboxgroup")) {
                var grpName = $(this).data("checkboxgroup");
                var selected = $("input[data-checkboxgroup=" + grpName + "]:checked");
                if (selected.length > maxNum) callback(false, "You cannot select more than " + maxNum + " option(s).", 250);
                else callback(true);
            }
            else callback(true); //if the input isn't a checkbox group, it succeeds automatically
        },
        minChecked: function minChecked(callback) {
            var minNum = $(this).data("minchecked");
            if ($(this).data("checkboxgroup")) {
                var grpName = $(this).data("checkboxgroup");
                var selected = $("input[data-checkboxgroup=" + grpName + "]:checked");
                if (selected.length < minNum) callback(false, "You must select at least " + minNum + " option(s).", 250);
                else callback(true);
            }
            else callback(true); //if the input isn't a checkbox group, it succeeds automatically
        },
        verifyMatch: function verifyMatch(callback) {
            var toMatch = $("#" + $(this).data("matchfield"));
            if ($(this).val() === toMatch.val()) callback(true);
            else callback(false, "Passwords must match.", 200 );
        },
        email: function email(callback) {
            var re = new RegExp("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+.[A-Za-z]{2,4}$");
            callback(validationRules.regexTester($(this), re), "Not a valid email format.", 200);
        },
        ssn: function ssn(callback) {
            var re = new RegExp("^(?!000)([0-6]\\d{2}|7([0-6]\\d|7[012]))([ -]?)(?!00)\\d\\d\\3(?!0000)\\d{4}$");
            callback(validationRules.regexTester($(this), re), "Not a valid social security number.", 200);
        },
        uscurrency: function uscurrency(callback) {
            var re = new RegExp("^(\\$|)([1-9]\\d{0,2}(\\,\\d{3})*|([1-9]\\d*))(\\.\\d{2})?$");
            callback(validationRules.regexTester($(this), re), "Not a valid amount.", 200);
        },
        phone: function phone(callback) {
            var re = new RegExp("^\\D?(\\d{3})\\D?\\D?(\\d{3})\\D?(\\d{4})$");
            callback(validationRules.regexTester($(this), re), "Not a valid phone number.", 200);
        },
        numeric: function numeric(callback) {
            var re = new RegExp("/[0-9]|\\./");
            callback(validationRules.regexTester($(this), re), "Only digits are allowed.", 200);
        },
        zip: function zip(callback) {
            var re = new RegExp("^\\d{5}$");
            callback(validationRules.regexTester($(this), re), "Not a valid zip code.", 200);
        },
        date: function date(callback) {
            var re = new RegExp("^(?:(?:(?:0?[13578]|1[02])(\\/|-|\\.)31)\\1|(?:(?:0?[1,3-9]|1[0-2])(\\/|-|\\.)(?:29|30)\\2))(?:(?:1[6-9]|[2-9]\\d)?\\d" +
                "{2})$|^(?:0?2(\\/|-|\\.)29\\3(?:(?:(?:1[6-9]|[2-9]\\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|" +
                "^(?:(?:0?[1-9])|(?:1[0-2]))(\\/|-|\\.)(?:0?[1-9]|1\\d|2[0-8])\\4(?:(?:1[6-9]|[2-9]\\d)?\\d{2})$");
            callback(validationRules.regexTester($(this), re), "Not a valid date.", 200);
        },
        url: function url(callback) {
            var re = new RegExp("^(http|https|ftp)\\://[a-zA-Z0-9\\-\\.]+\\.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?/?([a-zA-Z0-9\\-\\._\\?\\,\\'/\\\\+&amp;%\\$#\\=~])*$");
            callback(validationRules.regexTester($(this), re), "Not a valid url.", 200);
        },
        password: function password(callback) { //Password must be at least 8 characters, no more than 40 characters, and must include at least one upper case letter, one lower case letter, and one digit.
            var re = new RegExp("^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,40}$");
            callback(validationRules.regexTester($(this), re), "Password must be at least 8 characters and include both upper and lower case letters and a number.", 300);
        },
        regexTester: function regexTester(obj, regEx) {
            var isValid = regEx.test(obj.val());
            if (obj.val() !== "" && !isValid) return isValid;
            return true;
        }
    };
    return {    //exposed functions
        setAdditionalEvents: setAdditionalEvents,
        validate: validate,
        removeErrors: removeErrors,
        validationRules: validationRules
    };
})(jQuery);
