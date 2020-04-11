// ==UserScript==
// @name         填表网自动复制ID脚本
// @version      0.0.2
// @description  按说正常工作的时候可以自动复制填表网的ID
// @icon         http://game.granbluefantasy.jp/favicon.ico
// @author       Yuee
// @include      /^https?:\/\/.+-raidfinder\.herokuapp\.com.*$/
// @include      /^https?:\/\/gbf-raidfinder\.aikats\.us.*$/
// @include      /^https?:\/\/gbf-raidfinder\.la-foret\.me.*$/
// @include      /^https?:\/\/gbf-tbw\.tk.*$/
// @include      /^https?:\/\/gbf.xinoassassin.me.*$/
// @require      https://code.jquery.com/jquery-3.3.1.min.js
// @grant        GM.setClipboard
// ==/UserScript==

(function() {
    'use strict';

    const addStyle = (css) => {
    const style = document.createElement('style')
        style.innerText = css
        document.head.appendChild(style)
    }

    addStyle(`
        #auto-copy-option{display: block;bottom: 10px;position: absolute;width: 200px;z-index: 100;overflow: hidden;background: #fdfaf5;border: solid #dfcbb7;border-width: 0 1px 1px;font-size: 14px;    box-shadow: 0px 0px 1px #150f0f, 0px 0px 1px #150f0f, 0px 0px 1px #150f0f, 0px 0px 2px #150f0f, 0px 0px 2px #150f0f, 0px 0px 2px #150f0f;}
        #auto-copy-option.left{left: 10px;}
        #auto-copy-option.right{right: 108px;}
        #auto-copy-option hr{margin: 1px 0;}
        .aco-title{text-align: center; line-height: 30px; height: 30px; background-color: #ffe4b7; border: solid #dfcbb7; border-width: 1px 0; color: #f2eee2; text-shadow: 0px 0px 1px #150f0f, 0px 0px 1px #150f0f, 0px 0px 1px #150f0f, 0px 0px 2px #150f0f, 0px 0px 2px #150f0f, 0px 0px 2px #150f0f;}
        .ac-switch{background: #e46969; width: 40px; height: 20px; border: 1px solid #3e3e3e; margin-left: 10px; cursor: pointer;}
        .ac-switch.on{background: #8ce469;}
        .ac-switch-title, .ac-switch{display: inline-block; vertical-align: middle;}
        .aco-block{padding: 5px;}
        .ac-pos-switch>div{width: 22px; height: 20px; text-align: center; border: 1px solid #3e3e3e; margin-left: 8px; cursor: pointer; display: inline-block;}
        .ac-pos-switch{display: inline-block; margin-left: 2px;}
        .ac-pos-switch>div.on{background: #8ce469;}
        .current-raid-name, .current-raid-id {overflow: hidden;white-space:nowrap;text-overflow:ellipsis;}
        .aco-setting{position: relative;}
        .vajra-icon{width: 50px; height: 30px; position: absolute; right: 5px; top: 8px;}
        .vajra-icon img{max-width: 100%; height: auto;}
    `)

    var AutoCopy = {
        ls_key: 'AutoCopyOption',
        pos: 0,  // 浮层所处位置，0=左，1=右
        data: {}, // 哪些raid被加了开关
        // 以上会保存到LS里

        flag_enable: false,  // 当前状态存储
        init_is_done: false,  // 是否初始化过
        watchers: {},

        switch_flag: function(){
            this.flag_enable = !this.flag_enable
        },

        switch_copy_status: function($mdl){
            var raid_name = $mdl.find('.gbfrf-column__header-name').text();
            var $status = $mdl.find('.auto-copy-status');

            if (this.data[raid_name]){
                delete this.data[raid_name];
                $status.addClass('is-hidden');
            }else{
                this.data[raid_name] = true;
                $status.removeClass('is-hidden');
            }

            this.saveLocalStorage();
        },

        init: function(){
            var self = this;
            this.loadLocalStorage();
            this.init_ui();

            // 注册开关事件
            $('body').on('mousedown', '.auto-copy-switch', function(e){
                self.switch_copy_status($(this).parents('.mdl-layout'));
                if (self.isEnable()){
                    self.stop_all();
                    self.start_all();
                }
            });
        },

        init_ui: function(){
            var self = this;
            var $div = $('<div id="auto-copy-option"></div>').appendTo($('body'));
            $div.append('<div class="aco-title">自动复制填表ID小工具</div>')

            var $setting_div = $('<div class="aco-setting"></div>').appendTo($div);

            $setting_div.append('<div class="aco-block"><div class="ac-switch-title">当前状态：<span>关</span></div><div class="ac-switch"></div></div>')
            $setting_div.append('<div class="aco-block"><div class="ac-switch-title">浮层位置：</div><div class="ac-pos-switch"><div>左</div><div>右</div></div></div>')
            $setting_div.append('<div class="vajra-icon" title="瓦姬拉天下第一！"><img src="http://game-a1.granbluefantasy.jp/assets/img/sp/assets/npc/s/3040147000_81.jpg"></img></div>')
            //
            // 浮层位置
            $div.find('.ac-pos-switch div').eq(this.pos).addClass('on');
            if (this.pos == 0){
                $div.addClass('left');
            }else{
                $div.addClass('right');
            }

            $div.append('<hr>')
            $div.append('<div class="aco-block"><div class="current-raid-name">请等填表网加载完</div><div class="current-raid-id">然后再点开关</div></div>')

            $div.find('.ac-switch').on('mousedown', function(e){
                self.switch_flag();
                if (self.isEnable()){
                    $(this).parents('.aco-block').find('.ac-switch-title span').text('开');
                    $(this).addClass('on');
                    self.start_all()
                    console.log('功能开启');
                }else{
                    $(this).parents('.aco-block').find('.ac-switch-title span').text('关');
                    $(this).removeClass('on');
                    self.stop_all()
                    console.log('功能关闭');
                }
            });
            $div.find('.ac-pos-switch div').on('mousedown', function(e){
                if (!$(this).hasClass('on')){
                    var $switch_group = $(this).parent('.ac-pos-switch').find('div');
                    self.set_pos($switch_group.index($(this)));
                }
            });
        },

        set_pos: function(pos){
            if (pos == this.pos) {return;}

            var $top_div = $('#auto-copy-option');
            var $switch_group = $top_div.find('.ac-pos-switch div');

            this.pos = pos;
            $switch_group.removeClass('on');
            $switch_group.eq(pos).addClass('on');

            if (pos == 0){
                $top_div.removeClass('right');
                $top_div.addClass('left');
            }else{
                $top_div.removeClass('left');
                $top_div.addClass('right');
            }

            this.saveLocalStorage();
        },

        isEnable: function(){
            return this.flag_enable;
        },

        saveLocalStorage: function(){
            var ls_data = {
                pos: this.pos,
                data: this.data,
            }
            localStorage.setItem(this.ls_key, JSON.stringify(ls_data));
        },

        loadLocalStorage: function(){
            var ls_data = JSON.parse(localStorage.getItem(this.ls_key));
            if (!ls_data) { ls_data = {}; }

            if (ls_data.pos != undefined){
                this.pos = ls_data.pos;
            }
            if (ls_data.data != undefined){
                this.data = ls_data.data;
            }
        },

        start_all: function(){
            var self = this;

            // 初始化，添加各元素
            // 已经监听总列表，如果列表发生变化就重新生成一遍
            if (!this.init_is_done) {
                this.regenerate_addon_content();
                // 添加监听
                this.add_raid_list_observer();
                this.init_is_done = true;

                // console.log('初始化完成');
            }
            // 添加所有监视器
            this.add_raid_observer();
        },

        // 监视raid
        add_raid_observer: function(){
            var self = this;
            var columns = $('.gbfrf-columns .gbfrf-column');

            columns.each(function(){
                var raid_name = $(this).find('.gbfrf-column__header-name').text();
                if (!self.data[raid_name]) { return; }
                var $mdl_list = $(this).find('.mdl-list');

                var config = { childList: true };

                var callback = function(mutationsList) {
                    for(var mutation of mutationsList) {
                        if (mutation.type == 'childList' && mutation.addedNodes.length > 0) {
                            var $node = $(mutation.addedNodes).eq(0);
                            if ($node[0].className == 'gbfrf-tweet gbfrf-js-tweet mdl-list__item'){
                                var raid_id = $node.attr('data-raidid');
                                // console.log(raid_name,'新ID：',raid_id);
                                GM.setClipboard(raid_id);

                                self.update_last_raid_info(raid_name, raid_id);
                            }
                        }
                    }
                }

                self.watchers[raid_name] = new MutationObserver(callback);
                self.watchers[raid_name].observe($mdl_list.get(0), config);
                // console.log('开始监视'+raid_name);
            });
        },

        // 更新最新复制的内容
        update_last_raid_info(raid_name, raid_id){
            var $top_div = $('#auto-copy-option');
            $top_div.find('.current-raid-name').text(raid_name);
            $top_div.find('.current-raid-id').text(raid_id);
        },

        // 停止并删除所有监视器
        // 但不会停下列表监视器
        stop_all: function(){
            for (var key in this.watchers){
                this.watchers[key].disconnect();
                delete this.watchers[key];
            }
        },

        add_raid_list_observer: function(){
            var self = this;
            var node = $('.gbfrf-columns').get(0);
            // console.log(node);
            var config = { childList: true };
            var callback = function(mutationsList) {
                self.regenerate_addon_content();
                if (self.isEnable()){
                    self.stop_all();
                    self.start_all();
                }
            };
            var observer = new MutationObserver(callback);
            observer.observe(node, config);
        },

        // 重新生成所有添加内容
        regenerate_addon_content: function(){
            var self = this;
            var $columns = $('.gbfrf-columns .gbfrf-column');

            // 先删除已经有的
            $columns.find('.auto-copy-addon').remove();

            // 重新添加标记
            $columns.each(function(){
                var $li = $('<li></li>');
                $li.addClass('mdl-menu__item auto-copy-addon auto-copy-switch');
                $li.append('<i class="gbfrf-column__header-row-icon material-icons">file_copy</i><span>自动复制</span>');
                $li.appendTo($(this).find('ul.mdl-menu'));

                var $div = $('<div></div>');
                $div.addClass('gbfrf-column__notification-banner-item auto-copy-addon auto-copy-status')
                $div.append('<i class="gbfrf-column__notification-banner-icon material-icons">file_copy</i> 复制 : 开')
                $div.appendTo($(this).find('.gbfrf-column__notification-banner-container'));

                var raid_name = $(this).find('.gbfrf-column__header-name').text();
                if (!self.data[raid_name]) { $div.addClass('is-hidden'); }
            });
        },
    }

    $(document).ready(function() {
        AutoCopy.init();
    });

})();
