validator
=========

JavaScript validator

validator.js is a simple to use JavaScript form validation tool that provides plenty of options for displaying and placing error messages and has been written to make the least amount of coding on the developer's part as possible. Everything runs off html data-attributes and css classes. There is no need to create a validation object with rules and elements/forms to validate. It allows custom validation rules to be written, and they can even be asynchronous. The validator also supports help text and character restrictions on inputs.

A good place to start is with the HTML page included in this repo. All the functionality of the validator is used on that page. The html will need both JQuery and JQuery UI to be fully functional, although the validator itself only requires JQuery 1.7+.

The wiki for this repo contains setup/usage instructions. I have also uploaded a .docx file - which details a slightly older version of validator.js, but it does have code samples and screenshots.

The validator.css file in this repo is the one you'd want to use should you decide to play around with the validator. It is a stripped down css file with all the necessary classes and only the minimal required styles. form.css is the one I've been using to test the validator in my mock up website. It does contain all the necessary classes, but they have additional styling being used on them.

The html page is my test page for the validator to do initial testing of new features. You'll find it's fairly scatter-brained, but I believe all of the functionality of validator.js is on display there. To get validate.html working, you'll need the files form.css and validator.js. It's also currently using JQuery and JQuery UI CDNs. As stated above, while the example page requires JQuery UI, the validator itself does not. Some of the functionality has been tested against production websites, but not all of it has been vetted in the real world yet. I look forward to hearing about the bugs and additional feature requests from anyone who uses this.

I am currently working on an extension to validator.js that will format inputs for the user as specified by the developer. It will be able to take in basic formatting or a regex string can be supplied that will format input as the user types - only allowing characters as specified and adding any formatting such as "-", or ",".

The repo for the formatter is at: https://github.com/mosbymc/inputformatter


# **validator.js**
validator.js is a JQuery 1.7+ dependent validation tool that can be used to validate input elements, both as part of a form, or as a single input. While it certainly allows a developer to write their own validation rules, it also has a library of predefined rules you can use to check against, like email, phone number, zip codes, URLs, etc.

When initialized, the validator listens at the window level for specific events to start off the validation process. This means that even if you switch partial views or dynamically insert DOM elements, you'll never need to re-initialize the validator and any "new" form that is a part of the page is already being monitored by the validator.

Depending on your usage, after the initialization, you wouldn't need to write or call any functions at all. This is because the validator runs off of CSS classes and HTML data-attributes. In fact, everything beyond custom validation rules and your successful validation function is handled within the HTML, so very little coding is required.

Because validator.js uses callbacks for user defined validation rules, it is able to support asynchronous input testing. A common usage of this would be checking to see if a user name is already taken. Rather than having to submit the whole form only to find out that the username is taken, the validator will allow you to write your own asynchronous function to check the availability, and wait for the response before either submitting the form or displaying the error message.

When an input fails validation, an error message is displayed to alert the user to the problem. Standard error message divs are displayed as a fixed position element so it will not affect the layout of the dom when placed. However, there are several options available for how and where to display the error messages, so if the default display doesn't work well on your website, you can try one of the other display methods.



Continue to validator.js wiki: https://github.com/mosbymc/validator/wiki
