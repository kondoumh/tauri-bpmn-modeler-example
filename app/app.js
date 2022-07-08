import $ from 'jquery';

import BpmnModeler from 'bpmn-js/lib/Modeler';

import diagramXML from '../resources/newDiagram.bpmn';

import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';

const container = $('#js-drop-zone');

const modeler = new BpmnModeler({
  container: '#js-canvas'
});

function createNewDiagram() {
  openDiagram(diagramXML);
}

async function openDiagram(xml) {
  try {

    await modeler.importXML(xml);

    container
      .removeClass('with-error')
      .addClass('with-diagram');
  } catch (err) {

    container
      .removeClass('with-diagram')
      .addClass('with-error');

    container.find('.error pre').text(err.message);

    console.error(err);
  }
}

function registerFileDrop(container, callback) {

  function handleFileSelect(e) {
    e.stopPropagation();
    e.preventDefault();

    const files = e.dataTransfer.files;
    const file = files[0];
    const reader = new FileReader();

    reader.onload = e => {
      const xml = e.target.result;
      callback(xml);
    };

    reader.readAsText(file);
  }

  function handleDragOver(e) {
    e.stopPropagation();
    e.preventDefault();

    e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

  container.get(0).addEventListener('dragover', handleDragOver, false);
  container.get(0).addEventListener('drop', handleFileSelect, false);
}


// file drag / drop ///////////////////////

// check file api availability
if (!window.FileList || !window.FileReader) {
  window.alert(
    'Looks like you use an older browser that does not support drag and drop. ' +
    'Try using Chrome, Firefox or the Internet Explorer > 10.');
} else {
  registerFileDrop(container, openDiagram);
}

// bootstrap diagram functions

$(function() {

  $('#js-create-diagram').on('click', e => {
    e.stopPropagation();
    e.preventDefault();

    createNewDiagram();
  });

  const saveDiagramLink = $('#js-save-diagram')
  const saveSvgLink = $('#js-save-svg');

  $('.buttons a').on('click', e => {
    if (!$(this).is('.active')) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  function setActive(link, data) {
    if (data) {
      link.addClass('active');
    } else {
      link.removeClass('active');
    }
  }

  var exportArtifacts = debounce(async function() {
    try {
      const { xml } = await modeler.saveXML({ format: true });
      setActive(saveDiagramLink, xml);
    } catch (err) {
      console.error('Error happened saving XML: ', err);
      setActive(saveDiagramLink, null);
    }

    try {
      const { svg } = await modeler.saveSVG();
      setActive(saveSvgLink, svg);
    } catch (err) {
      console.error('Error happened saving svg: ', err);
      setActive(saveSvgLink, null);
    }
  }, 500);

  saveDiagramLink.on('click', async () => {
    const { xml } = await modeler.saveXML({ format: true });
    const path = await save({ defaultPath: 'diagram.bpmn' });
    if (path) {
      await writeTextFile(path, xml);
    }
  })

  saveSvgLink.on('click', async () => {
    const { svg } = await modeler.saveSVG();
    const path = await save({ defaultPath: 'diagram.svg' });
    if (path) {
      await writeTextFile(path, svg);
    }
  });

  modeler.on('commandStack.changed', exportArtifacts);
});



// helpers //////////////////////

function debounce(fn, timeout) {

  let timer;

  return function() {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(fn, timeout);
  };
}
