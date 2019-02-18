
var scrollController = null;
var group = null;

function setupPathAnimation(svgGroup, duration)
{
  var allPaths = $(svgGroup).find('path');
  // console.log('will animate '+allPaths.length+' paths');

  var pathsTween = [];
  allPaths.each(function(idx, p){
    var pLen = p.getTotalLength();

    var tween = TweenMax.fromTo(p,duration,
      {
        opacity: '0',
        strokeDasharray: pLen.toString()+" "+pLen.toString(),
        strokeDashoffset: pLen.toString()+'px'
      },
      {
        strokeDashoffset: '0'
      });

    var markerEnd =  $(p).attr('marker-end') ? $(p).attr('marker-end') : '';
    var markerStart = $(p).attr('marker-start') ? $(p).attr('marker-start') : '';

    // nullify markers now
    $(p).attr('marker-end','');
    $(p).attr('marker-start', '');

    // trigger on start
    tween.eventCallback('onStart', function(){
      $(p).css('opacity', '1');
      $(p).attr('marker-start', markerStart);
    });

    // trigger at the end of path drawing
    tween.eventCallback('onComplete', function(){
      $(p).attr('marker-end',markerEnd);
    });
    tween.eventCallback('onReverseComplete', function(){
      $(p).attr('marker-end','');
      $(p).attr('marker-start', '');
      $(p).css('opacity', '0');
    });

    pathsTween.push(tween);
  });

  return pathsTween;
}

function setupBlockAnimation(svgGroup, duration)
{
  return TweenMax.fromTo(svgGroup, duration,
    {
      opacity: '0'
    },
    {
      opacity: '1'
    });
}

function setupAnimationStep(annotationScene, svgAnimationGroup)
{
  var steps = $(svgAnimationGroup).find('>g');
  // console.log('found animation steps '+steps.length);

  var stepDuration = 1./steps.length;
  var animationTimeline = new TimelineMax();
  steps.each(function(idx, s){
    var cl = $(s).attr('class');
    var stepTween = null;

    if (cl == 'svg-anim-path')
      stepTween = setupPathAnimation(s, stepDuration);
    else
      stepTween = setupBlockAnimation(s, stepDuration);

    animationTimeline.add(stepTween, idx*stepDuration, 'start');
  });

  svgAnimationGroup.style.opacity = "1";
  annotationScene.setTween(animationTimeline);
}

function adjustPhonySvgBlocks(allContents)
{
  if ($('.scrollable-svg').length)
  {
    var scrollSteps = $('.svg-scroll-step');
    var startIdx = 0;
    $('.scrollable-svg').each(function(scrollableSvgIdx, svg){
      var animationGroups = $(svg).find('svg>g');
      var svgIdx = null;

      allContents.each(function(idx, p){
        if (p == svg) svgIdx = idx;
      });

      // get phony paragraphs for svg
      var scrollParagraphs = scrollSteps.slice(startIdx, startIdx+animationGroups.length-1);
      startIdx += scrollParagraphs.length;

      // adjust heights of SVG animation phony content elements
      console.log('phony scrollsteps '+scrollParagraphs.length+' adjust. svg '+svgIdx+' height '+svg.offsetHeight);
      scrollParagraphs.each(function(idx, p){
          $(p).css('height', svg.offsetHeight.toString()+'px');
      });
    });
  }
}

function setupScrollScenes()
{
  console.log('setting up scroll scenes...');

  if (scrollController)
    delete scrollController;
  scrollController = new ScrollMagic.Controller({logLevel:0});

  // set up project header pin
  var header = $('.project-page header')[0];
  var headerScene = new ScrollMagic.Scene({
    triggerElement: header,
    triggerHook: 0
  }).setPin(header);
  scrollController.addScene(headerScene);

  // NOTE:
  // the page structure is assumed to follow this rule:
  // - all direct children of .project-content are either annotations or content
  // - annotations and content are separated in two columns (using css grid)
  // - it is assumed that even children are annotations (left column)
  //    and odd children are content
  var allAnnotations = $('.project-content').children().filter(':even');
  var allContents = $('.project-content').children().filter(':odd');

  // setup pinning for every paragraph
  var annScrollScenes = {};
  var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  var scrollHook = header.clientHeight/h;

  adjustPhonySvgBlocks(allContents);

  // console.log('viewport h '+h+' header '+header.offsetHeight);
  allAnnotations.each(function(idx, p){
    if (idx < allContents.length)
    {
      var imgBlock = allContents[idx];
      var scrollDuration = imgBlock.clientHeight-p.offsetHeight;

      // console.log('para'+idx+' scroll: '+imgBlock.clientHeight+'-'+p.clientHeight+'='+scrollDuration);
      var scrollScene = new ScrollMagic.Scene({
          triggerElement:p,
          triggerHook:scrollHook,
          duration:scrollDuration
        }).setPin(p);
      // scrollScene.addIndicators({
      //     name: 'para'+idx, // custom name for your scene
      //     indent: 20, // indent from the browser edge
      //     colorStart: 'yellow', // custom color - colorEnd
      //     colorTrigger: 'yellow',
      //   });
      scrollScene.on('start end', function(ev){
        var para = $(scrollScene.triggerElement());

        if (!para.attr('data-text'))
          para.attr('data-text', para.text());

        if (ev.type == 'end')
        {
          if (para.hasClass('glitch'))
            para.removeClass('glitch');
          else
            para.addClass('glitch');
        }

        if (ev.type == 'start')
          para.removeClass('glitch');
      });

      annScrollScenes[idx] = scrollScene;
      scrollController.addScene(scrollScene);
    }
  });

  // setup SVG animation, if SVG exists on the page
  // for SVG to animate:
  // - have inline SVG
  // - inside <svg> have animation steps split into groups using <g> (should be direct children)
  // - annotation paragraphs number should be equal to animation group number
  // - for every SVG animation step annotation paragraph, have a phony content
  //    paragraph (see page layout rules above) with class "svg-scroll-step"
  // - animation group 0 is visible by default -- this is the start-off, all
  //    other groups are hidden by default
  if ($('.scrollable-svg').length)
  {
    $('.scrollable-svg').each(function(scrollableSvgIdx, svg){
      var animationGroups = $(svg).find('svg>g');
      var svgIdx = null;

      allContents.each(function(idx, p){
        if (p == svg) svgIdx = idx;
      });

      // get paragraphs for svg
      var svgStepAnnotations = allAnnotations.slice(svgIdx,animationGroups.length);
      var svgPinDuration = (animationGroups.length-1)*svg.offsetHeight;

      var svgPin = new ScrollMagic.Scene({
        triggerElement: svg,
        triggerHook: scrollHook,
        duration: svgPinDuration
      }).setPin(svg, {pushFollowers: false});
      // svgPin.addIndicators({
      //   name: 'triggerDown', // custom name for your scene
      //   indent: 520, // indent from the browser edge
      //   colorStart: 'yellow', // custom color - colorEnd
      //   colorTrigger: 'yellow',
      // });
      scrollController.addScene(svgPin);

      console.log('found scrollable SVG '+scrollableSvgIdx+
                  ' height '+svg.offsetHeight+
                  ' which has '+animationGroups.length+' animation groups.'+
                  ' will pin it for '+svgPinDuration+' pixels ('+
                  (animationGroups.length-1)+'x'+svg.offsetHeight+')');

      // setup scenes for every animation group
      // by default, hide all groups except first one
      animationGroups.each(function(idx, g){
        if (idx > 0)
            setupAnimationStep(annScrollScenes[idx+svgIdx-1], g);
          });

          // now we're ready for animation
          svg.style.opacity = "1";
    });
  }
}

var mediaMobile = window.matchMedia("(max-width: 1000px)");
mediaMobile.addListener(function(m){
  if (m.matches)
  {
    scrollController = scrollController.destroy( true );
  }
  else
  {
    setupScrollScenes();
  }
});

if (!mediaMobile.matches)
  $( window ).on( "load", setupScrollScenes);
  // $( document ).ready(setupScrollScenes);
