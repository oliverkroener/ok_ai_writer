..  include:: /Includes.rst.txt

..  _usage:

=====
Usage
=====

AI Text Generator
=================

The AI Text Generator lets you create and iteratively refine content through
a conversational interface.


Generating content
------------------

1. Place your cursor in a CKEditor field where you want to insert content.
2. Click the **AI Text** toolbar button (sparkle icon).
3. In the dialog, type a prompt describing the content you need, e.g.
   *"Write an introduction about sustainable urban planning"*.
4. Press **Enter** or click the send button.
5. The generated HTML content appears in the preview area.

..  tip::

    Be specific in your prompts. Instead of *"Write about sustainability"*,
    try *"Write a 200-word introduction about sustainable urban planning
    for a municipal website, targeting city council members"*.


Refining content
----------------

After the initial generation, you can refine the result with follow-up
instructions:

6. Type a follow-up instruction in the input field, e.g.
   *"make it shorter"*, *"more formal"*, or *"add a call to action"*.
7. The AI retains the full conversation context and adjusts the content
   accordingly.
8. Repeat until you're satisfied with the result.

..  note::

    The conversation history is maintained for the entire dialog session.
    Each refinement builds on the previous result. Closing the dialog
    resets the conversation.


Inserting into the editor
-------------------------

9. Click **Insert into Editor** to insert the final content at the cursor
    position in CKEditor.

The dialog closes automatically and focus returns to the editor.


Keyboard shortcuts
------------------

==================  ============================================
Shortcut            Action
==================  ============================================
**Enter**           Send prompt / generate text
**Shift + Enter**   New line in the prompt input
**Escape**          Close the dialog
==================  ============================================


Token tracking
--------------

The dialog displays cumulative input and output token counts at the bottom
right corner. This helps editors monitor API usage during a session.

..  hint::

    Token counts reset when the dialog is closed and reopened. They track
    cumulative usage across all prompts within a single dialog session.


Lorem Ipsum
============

The Lorem Ipsum plugin inserts placeholder text for layout prototyping.

1. Place the cursor where you want the text inserted.
2. Click the **Lorem Ipsum** toolbar button (text lines icon).
3. Three paragraphs of Lorem Ipsum are inserted at the cursor position.

..  tip::

    The Lorem Ipsum plugin is especially handy during development and layout
    work. You can remove it from the toolbar in production by omitting
    ``loremIpsum`` from your RTE preset's toolbar items.
