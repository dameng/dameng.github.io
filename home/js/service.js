/// <reference path="../../shipxyAPI.js" />
/// <reference path="../../shipxyMap.js" />
/// <reference path="../fleetData.js" />
/// <reference path="myApp.js" />
/// <reference path="view.js" />
(function () {
    var searchMaxCount = 100, //查询结果最大返回数
    searchOj = null, //API查询工具对象
    trackObj = null, //API正在查询的轨迹工具对象
    trackObjs = [], //缓存轨迹列表
    fleetObj = null, //API船队对象
    fleetGroupList = null, //船队分组列表，组名、组颜色、自定义船名
    fleetShipList = {}; //船队的所有船舶对象列表

    //初始化船队
    var initFleet = function () {
        if (fleetData) {
            var fleetIds = []; //id数组
            fleetGroupList = {};
            var i = 0, j, len1 = fleetData.length, len2, g, gd, id, d;
            for (; i < len1; i++) {
                g = fleetData[i];
                gd = g.data;
                for (j = 0, len2 = gd.length; j < len2; j++) {
                    d = gd[j];
                    id = d.shipId;
                    fleetIds.push(id);
                    fleetGroupList[id] = { color: g.groupColor, customName: d.customName };
                }
            }
            fleetObj = new shipxyAPI.AutoShips(fleetIds, shipxyAPI.Ships.INIT_SHIPID); //构建API船队对象
            fleetObj.getShips(fleetCallback); //调用API的请求批量船舶数据接口
            fleetObj.setAutoUpdateInterval(30); //调用API的设置自动更新间隔=30秒
            fleetObj.startAutoUpdate(fleetCallback); //调用API的开启自动更新
            myApp.view.showList('fleetlist', fleetData); //显示对象列表
        }
    };
    var fleetCallback = function (status) {
        if (status == 0) {//成功
            showShips(this.data);
        } else {//错误
            errorTip(status);
        }
    };

    //根据船舶数据数组显示船舶
    var showShips = function (shipDatas) {
        if (!shipDatas || shipDatas.length == 0) return;
        var i = 0, len = shipDatas.length, d, opts, ship;
        for (; i < len; i++) {
            d = shipDatas[i];
            ship = fleetShipList[d.shipId];
            if (!ship) {//新增的
                opts = new shipxyMap.ShipOptions();
                ship = new shipxyMap.Ship(d.shipId, d, opts);
                fleetShipList[d.shipId] = ship;
            } else {//更新的
                opts = ship.options;
                ship.data = d;
            }
            opts.fillStyle.color = fleetGroupList[d.shipId].color.replace('#', '0x'); //给每条船匹配分组颜色
            myApp.map.addOverlay(ship);
            if (d.shipId == myApp.service.selectedShipId) {//当是选择船，打开船舶信息框
                myApp.view.showShipWin(d);
            }
        }
    };

    //船舶点击事件处理函数
    var addShipClickEvent = function () {
        //调用API的注册船舶事件接口
        myApp.map.addShipEventListener(shipxyMap.Event.CLICK, function (event) {
            //从缓存中来获取数据
            var shipId = event.overlayId;
            var ship = myApp.map.getOverlayById(shipId);
            if (ship) {
                myApp.service.selectShip(shipId); //框选
                myApp.view.showShipWin(ship.data); //显示船舶信息框
            }
            //请求最新数据来展示
            var that = this;
            var ships = new shipxyAPI.Ships(shipId, shipxyAPI.Ships.INIT_SHIPID);
            ships.getShips(function (status) {
                if (status == 0) {
                    var data = this.data[0];
                    if (data) {
                        if (ship) ship.data = data;
                        else ship = new shipxyMap.Ship(data.shipId, data);
                        myApp.service.selectShip(shipId); //框选
                        myApp.view.showShipWin(ship.data); //显示船舶信息框
                    }
                }
            });
        });
        myApp.map.addShipEventListener(shipxyMap.Event.MOUSE_OVER, function (event) {
            var shipId = event.overlayId;
            var ship = myApp.map.getOverlayById(shipId);
            myApp.view.showShipTip(ship.data); //显示船舶简单信息提示
        });
        myApp.map.addShipEventListener(shipxyMap.Event.MOUSE_OUT, function (event) {
            myApp.view.hideShipTip(); //隐藏船舶简单信息提示
        });
    };

    //轨迹点鼠标移上事件处理函数
    var trackover = function (event) {
        var track = myApp.map.getOverlayById(event.overlayId);
        var shipData = myApp.map.getOverlayById(track.data.shipId).data;
        myApp.view.showTrackTip({ name: shipData.name, callsign: shipData.callsign, MMSI: shipData.MMSI, IMO: shipData.IMO }, event.extendData); //显示轨迹点信息提示
    };
    //轨迹点鼠标移出事件处理函数
    var trackout = function (event) {
        myApp.view.hideTrackTip(); //隐藏轨迹点信息提示
    };

    //定位该船
    var locate = function (ship, options) {
        if (options) {
            if (options.color) {
                ship.options.fillStyle.color = options.color.replace('#', '0x');
            }
        }
        myApp.map.addOverlay(ship, true); //优先显示
        myApp.map.locateOverlay(ship, myApp.service.locateShipZoom); //定位船舶
        myApp.service.selectShip(ship.data.shipId); //框选船舶
        myApp.view.showShipWin(ship.data); //显示船舶信息框
    };

    //错误提示
    var errorTip = function (errorCode) {
        switch (errorCode) {
            case 1:
                myApp.Message.error('网站服务出错！错误原因：服务过期。错误代码：1。');
                break;
            case 2:
                myApp.Message.error('网站服务出错！错误原因：服务无效或被锁定。错误代码：2。');
                break;
            case 3:
                myApp.Message.error('网站服务出错！错误原因：域名错误。错误代码：3。');
                break;
            case 4:
                myApp.Message.error('网站服务出错！错误原因：请求的数据量过大。错误代码：4。');
                break;
            case 100:
                myApp.Message.error('网站服务出错！错误原因：未知。错误代码：100。');
                break;
        }
    };

    myApp.service = {
        //初始化服务，包括注册船舶事件、初始化船队列表
        init: function () {
            initFleet();
            addShipClickEvent();
        },

        locateShipZoom: 10, //船舶定位级别
        selectedShipId: '-1', //被选择的船舶shipId

        //选择船舶
        selectShip: function (shipId) {
            if (shipId == this.selectedShipId) return;
            //先清除原先被选择船舶的选择框
            this.unselectShip(this.selectedShipId);
            var ship = myApp.map.getOverlayById(shipId);
            if (ship) {
                ship.options.isSelected = true;
                myApp.map.addOverlay(ship);
                this.selectedShipId = shipId;
            }
        },

        //反选船舶
        unselectShip: function (shipId) {
            if (shipId == '-1') return;
            var ship = myApp.map.getOverlayById(shipId);
            if (ship) {
                ship.options.isSelected = false;
                myApp.map.addOverlay(ship);
                this.selectedShipId = -1; //清除被选船舶shipId缓存
            }
        },

        //定位一条船,options可以包含一些改变此船外观显示的属性，比如颜色
        locateShip: function (shipId, options) {
            var ship = myApp.map.getOverlayById(shipId);
            if (ship) {//缓存里存在，定位
                locate(ship, options);
            }
            //请求最新数据来定位
            var that = this;
            var ships = new shipxyAPI.Ships(shipId, shipxyAPI.Ships.INIT_SHIPID); //构建API请求单条船舶数据对象
            //调用API的请求单条船舶数据接口
            ships.getShips(function (status) {
                if (status == 0) {
                    var data = this.data[0];
                    if (data) {
                        if (ship) ship.data = data;
                        else ship = new shipxyMap.Ship(data.shipId, data);
                        locate(ship, options);
                    } else {
                        myApp.service.unselectShip(that.selectedShipId); //框选船舶
                        myApp.view.showShipWin(that.getEmptyShipInfo(shipId)); //显示船舶信息框
                    }
                }
            });
        },

        //根据关键字查询船舶
        searchShip: function (key) {
            if (!key || key == '请输入船名、呼号、MMSI或IMO') { return; }
            if (!searchOj) {
                searchOj = new shipxyAPI.Search(); //构建API查询工具对象
            }
            var that = this;
            //调用API查询船舶接口
            searchOj.searchShip({ keyword: key, max: searchMaxCount }, function (status) {
                var data = this.data;
                if (status == 0 && data && data.length > 0) {//当有结果，先定位第一条结果到醒目位置
                    that.locateShip(data[0].shipId);
                }
                myApp.view.showList('searchlist', data); //刷新搜索结果列表
            });
        },

        //查询轨迹
        searchTrack: function (shipId, btime, etime) {
            this.abortSearchTrack();
            myApp.view.setTrackMsg('正在查询轨迹，请稍候...');
            trackObj = new shipxyAPI.Tracks();
            var that = this;
            //调用API的查询轨迹接口
            trackObj.getTrack(shipId, btime, etime, function (status) {
                //显示轨迹
                var trackData = this.data;
                if (status == 0 && trackData && trackData.data && trackData.data.length > 0) {
                    myApp.view.setTrackMsg('');
                    for (var i = 0; i < trackObjs.length; i++) {
                        //重复查询的，先从缓存里删除
                        if (trackObjs[i].data && trackObjs[i].data.trackId == trackObj.data.trackId) {
                            trackObjs.splice(i, 1);
                            that.delTrack(trackObj.data.trackId);
                            break;
                        }
                    }
                    var opts = new shipxyMap.TrackOptions();
                    opts.strokeStyle.color = 0x0000ff;
                    opts.pointStyle.strokeStyle.color = 0x0000ff;
                    opts.labelOptions.borderStyle.color = 0x0000ff;
                    var track = new shipxyMap.Track(trackData.trackId, trackData, opts);
                    myApp.map.addOverlay(track);
                    //注册轨迹点事件
                    myApp.map.addEventListener(track, shipxyMap.Event.TRACKPOINT_MOUSEOVER, trackover);
                    myApp.map.addEventListener(track, shipxyMap.Event.TRACKPOINT_MOUSEOUT, trackout);
                    trackObjs.push(trackObj); //存储当前的轨迹
                    trackObj = null;
                    myApp.view.showList("tracklist", trackObjs); //显示轨迹列表
                } else {
                    myApp.view.setTrackMsg('暂无轨迹');
                }
            });
        },

        //销毁轨迹查询
        abortSearchTrack: function () {
            if (trackObj) {
                trackObj.abort(); //销毁当前轨迹的请求
                trackObj = null;
                myApp.view.setTrackMsg('');
            }
        },

        //删除轨迹
        delTrack: function (trackId) {
            var track = myApp.map.getOverlayById(trackId);
            if (track) {
                //移除轨迹点事件
                myApp.map.removeEventListener(track, shipxyMap.Event.MOUSE_OVER, trackover);
                myApp.map.removeEventListener(track, shipxyMap.Event.MOUSE_OUT, trackout);
                myApp.map.removeOverlay(track); //删除轨迹显示
                //删除轨迹数据缓存
                for (var i = 0; i < trackObjs.length; i++) {
                    if (trackObjs[i].data && trackObjs[i].data.trackId == trackId) {
                        trackObjs.splice(i, 1);
                        break;
                    }
                }
                //刷新列表
                myApp.view.showList("tracklist", trackObjs);
            }
        },

        //定位轨迹
        locateTrack: function (trackId) {
            var track = myApp.map.getOverlayById(trackId);
            if (track) {
                myApp.map.addOverlay(track); //先添加
                myApp.map.locateOverlay(track); //定位
            }
        },

        //生成空船舶信息
        getEmptyShipInfo: function (shipId) {
            return { shipId: shipId, name: "", callsign: "", MMSI: "", IMO: "", type: "", status: "", length: NaN, beam: NaN, draught: NaN, lat: NaN, lng: NaN,
                heading: NaN, course: NaN, speed: NaN, rot: NaN, dest: "", eta: "", lastTime: NaN, country: "", cargoType: ""
            };
        }
    };
})();
