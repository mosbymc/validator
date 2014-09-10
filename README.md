validator
=========

JavaScript validator

While validator.js is mostly functional at the moment, there is still some clean up that needs to be done. I also need to add some comments in some places and remove some from others.

Also, until I have the time to write a proper readme, the wiki for this repo contains the same info, but in a slightly nicer format. I have also uploaded a .docx file - which details a slightly older version of validator.js, but it does have code samples as illustrations.

The validator.css file in this repo is the one you'd want to use should you decide to play around with the validator. It is a stripped down css file with all the necessary classes and only the minimal required styles. form.css is the one I've been using to test the validator in my mock up website. It does contain all the necessary classes, but they have additional styling being used on them.

The html page is my test page for the validator to do initial testing of new features. You'll find it's fairly scatter-brained, but I believe all of the functionality of validator.js is on display there. Some of the functionality has been tested against production websites, but not all of it has been vetted in the real world yet. I look forward to hearing about the bugs and additional feature requests from anyone who uses this.


# **validator.js**
validator.js is a JQuery-dependent validation tool that can be used to validate input elements, both as part of a form, or as a single input. While it certainly allows a developer to write their own validation rules, it also has a library of predefined rules you can use to check against, like email, phone number, zip codes, URLs, etc.

When initialized, the validator listens at the window level for specific events to start off the validation process. This means that even if you switch partial views or dynamically insert DOM elements, you'll never need to re-initialize the validator and any "new" form that is a part of the page is already being monitored by the validator.

Depending on your usage, after the initialization, you wouldn't need to write or call any functions at all. This is because the validator runs off of CSS classes and HTML data-attributes. In fact, everything beyond custom validation rules and your successful validation function is handled within the HTML, so very little coding is required.

Because validator.js uses callbacks for user defined validation rules, it is able to support asynchronous input testing. A common usage of this would be checking to see if a user name is already taken. Rather than having to submit the whole form only to find out that the username is taken, the validator will allow you to write your own asynchronous function to check the availability, and wait for the response before either submitting the form or displaying the error message.

When an input fails validation, an error message is displayed to alert the user to the problem. Standard error message divs are displayed as a fixed position element so it will not affect the layout of the dom when placed. However, there are several options available for how and where to display the error messages, so if the default display doesn't work well on your website, you can try one of the other display methods.
