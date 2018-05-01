describe('Test the SubtitleList class', function() {
    var subtitleList = null;

    beforeEach(module('amara.SubtitleEditor.subtitles.models'));
    beforeEach(module('amara.SubtitleEditor.mocks'));

    beforeEach(inject(function(SubtitleList) {
        subtitleList = new SubtitleList();
        subtitleList.loadEmptySubs('en');

        jasmine.addMatchers({
            toHaveTimes: function(util, customEqualityTesters) {
                return {
                    compare: function(actual, expected) {
                        var result = {};
                        result.pass = util.equals([actual.startTime, actual.endTime], expected);
                        return result;
                    }
                };
            }
        });
    }));

    describe('low level change functions', function() {
        it('inserts subtitles', function() {
            var sub1 = subtitleList._insertSubtitle(0);
            var sub2 = subtitleList._insertSubtitle(0, {
                startTime: 0,
                endTime: 100,
                region: 'top',
                content: 'test-content'
            });
            var sub3 = subtitleList._insertSubtitle(2, {startOfParagraph: true, content: 'test-content2'});
            expect(subtitleList.subtitles).toEqual([sub2, sub1, sub3]);
            expect(subtitleList.syncedCount).toEqual(1);

            expect(sub1).toHaveTimes([-1, -1]);
            expect(sub1.region).toEqual(undefined);
            expect(sub1.startOfParagraph).toEqual(true); // sub1 was the first subtitle, so startOfParagraph is true 
            expect(sub1.markdown).toEqual('');

            expect(sub2).toHaveTimes([0, 100]);
            expect(sub2.region).toEqual('top');
            expect(sub2.startOfParagraph).toEqual(true);
            expect(sub2.markdown).toEqual('test-content');

            expect(sub3).toHaveTimes([-1, -1]);
            expect(sub3.region).toEqual(undefined);
            expect(sub3.startOfParagraph).toEqual(true);
            expect(sub3.markdown).toEqual('test-content2');
        });

        it('updates subtitles', function() {
            subtitleList._insertSubtitle(0);
            var sub = subtitleList._insertSubtitle(1);

            subtitleList._updateSubtitle(1, {
                startTime: 500,
                endTime: 1000,
                region: 'top',
                startOfParagraph: true,
                content: 'test'
            });

            expect(sub.startTime).toEqual(500);
            expect($(sub.node).attr('begin')).toEqual('500');
            expect(sub.endTime).toEqual(1000);
            expect($(sub.node).attr('end')).toEqual('1000');
            expect(sub.region).toEqual('top');
            expect($(sub.node).attr('region')).toEqual('top');
            expect(sub.markdown).toEqual('test');
            expect($(sub.node).text()).toEqual('test');
        });

        it('removes subtitles', function() {
            var sub1 = subtitleList._insertSubtitle(0, {startTime: 500, endTime: 1000});
            var sub2 = subtitleList._insertSubtitle(1);
            var sub3 = subtitleList._insertSubtitle(2);
            expect(subtitleList.subtitles).toEqual([sub1, sub2, sub3]);
            expect(subtitleList.syncedCount).toEqual(1);

            subtitleList._removeSubtitle(1);
            expect(subtitleList.subtitles).toEqual([sub1, sub3]);
            expect(subtitleList.syncedCount).toEqual(1);

            subtitleList._removeSubtitle(1);
            expect(subtitleList.subtitles).toEqual([sub1]);
            expect(subtitleList.syncedCount).toEqual(1);

            subtitleList._removeSubtitle(0);
            expect(subtitleList.subtitles).toEqual([]);
            expect(subtitleList.syncedCount).toEqual(0);
        });

        it('supports bulk changes', function() {
            subtitleList._bulkChange([
                [subtitleList._insertSubtitle, 0, {startTime: 0, endTime: 100}],
                [subtitleList._insertSubtitle, 1, {startTime: 100, endTime: 200}],
                [subtitleList._insertSubtitle, 2, {startTime: 200, endTime:300}],
                [subtitleList._updateSubtitle, 2, {content: 'test-content'}],
                [subtitleList._removeSubtitle, 1, {}],
            ]);
            expect(subtitleList.subtitles.length).toEqual(2);
            expect(subtitleList.subtitles[0]).toHaveTimes([0, 100]);
            expect(subtitleList.subtitles[1]).toHaveTimes([200, 300]);
            expect(subtitleList.subtitles[1].markdown).toEqual('test-content');
        });


        it('invokes change callbacks', function() {
            var handler = jasmine.createSpyObj('handler', ['onChange']);
            subtitleList.addChangeCallback(handler.onChange);

            var sub = subtitleList._insertSubtitle(0);
            subtitleList._invokeChangeCallbacks();
            expect(handler.onChange).toHaveBeenCalledWith([{
                type: 'insert',
                subtitle: sub,
                before: null,
            }]);

            handler.onChange.calls.reset();
            var sub2 = subtitleList._insertSubtitle(0);
            subtitleList._invokeChangeCallbacks();
            expect(handler.onChange).toHaveBeenCalledWith([{
                type: 'insert',
                subtitle: sub2,
                before: sub
            }]);

            handler.onChange.calls.reset();
            subtitleList.updateSubtitleTime(sub, 500, 1500);
            subtitleList._invokeChangeCallbacks();
            expect(handler.onChange).toHaveBeenCalledWith([{
                type: 'update',
                subtitle: sub,
            }]);

            handler.onChange.calls.reset();
            subtitleList.updateSubtitleTime(sub, 500, 1500);
            subtitleList._invokeChangeCallbacks();
            expect(handler.onChange).toHaveBeenCalledWith([{
                type: 'update',
                subtitle: sub,
            }]);

            handler.onChange.calls.reset();
            subtitleList.updateSubtitleContent(sub, 'content');
            subtitleList._invokeChangeCallbacks();
            expect(handler.onChange).toHaveBeenCalledWith([{
                type: 'update',
                subtitle: sub,
            }]);

            handler.onChange.calls.reset();
            subtitleList._removeSubtitle(1);
            subtitleList._invokeChangeCallbacks();
            expect(handler.onChange).toHaveBeenCalledWith([{
                type: 'remove',
                subtitle: sub,
            }]);

            handler.onChange.calls.reset();
            subtitleList.removeChangeCallback(handler.onChange);
            var sub3 = subtitleList._insertSubtitle(0);
            subtitleList.updateSubtitleTime(sub3, 500, 1500);
            subtitleList.updateSubtitleContent(sub3, 'content');
            subtitleList._removeSubtitle(0);
            expect(handler.onChange.calls.count()).toEqual(0);
        });

    });

    it('should update timing', function() {
        var sub1 = subtitleList.insertSubtitleBefore(null);
        var sub2 = subtitleList.insertSubtitleBefore(null);
        expect(subtitleList.syncedCount).toEqual(0);
        subtitleList.updateSubtitleTime(sub1, 500, 1500);
        expect(sub1).toHaveTimes([500, 1500]);
        expect(subtitleList.syncedCount).toEqual(1);
        subtitleList.updateSubtitleTime(sub1, 1000, 1500);
        expect(sub1).toHaveTimes([1000, 1500]);
        expect(subtitleList.syncedCount).toEqual(1);
        subtitleList.updateSubtitleTime(sub2, 2000, 2500);
        expect(sub2).toHaveTimes([2000, 2500]);
        expect(subtitleList.syncedCount).toEqual(2);
    });

    it('should get and update regions', function() {
        var sub = subtitleList.insertSubtitleBefore(null);
        expect(sub.region).toEqual(undefined);
        subtitleList.updateSubtitleRegion(sub, 'top');
        expect($(sub.node).attr('region')).toEqual('top');
        expect(sub.region).toEqual('top');

        subtitleList.updateSubtitleRegion(sub, undefined);
        expect($(sub.node).attr('region')).toEqual(undefined);
        expect(sub.region).toEqual(undefined);
    });

    describe('insertBefore unsynced subtitle', function() {
        it('appends at the end if otherSubtitle is null', function() {
            var sub1 = subtitleList.insertSubtitleBefore(null);
            var sub2 = subtitleList.insertSubtitleBefore(null);
            expect(subtitleList.subtitles).toEqual([sub1, sub2]);
        });

        it('inserts unsynced subtitles otherSubtitle is unsynced', function() {
            var sub1 = subtitleList.insertSubtitleBefore(null);
            var sub2 = subtitleList.insertSubtitleBefore(sub1);
            expect(subtitleList.subtitles).toEqual([sub2, sub1]);
            expect(sub2.startTime).toEqual(-1);
            expect(sub2.endTime).toEqual(-1);
        });
    });

    describe('insertBefore with two synced subtitles', function() {
        var sub1, sub2;
        beforeEach(function() {
            sub1 = subtitleList._insertSubtitle(0);
            sub2 = subtitleList._insertSubtitle(1);
        });

        it('inserts a 3 second subtitle in the between otherSubtitle and the previous subtitle, if there is a 3 second gap', function() {
            subtitleList.updateSubtitleTime(sub1, 0, 1000);
            subtitleList.updateSubtitleTime(sub2, 5000, 6000);
            var newSub = subtitleList.insertSubtitleBefore(sub2);

            expect(subtitleList.subtitles).toEqual([sub1, newSub, sub2]);
            expect(newSub).toHaveTimes([1500, 4500]);
        });

        it('adjusts the end time of the previous subtitle to make room for the new subtitle, if there is less than a 3 second gap', function() {
            subtitleList.updateSubtitleTime(sub1, 0, 4000);
            subtitleList.updateSubtitleTime(sub2, 6000, 7000);
            var newSub = subtitleList.insertSubtitleBefore(sub2);

            expect(subtitleList.subtitles).toEqual([sub1, newSub, sub2]);
            expect(sub1).toHaveTimes([0, 3000]);
            expect(newSub).toHaveTimes([3000, 6000]);
        });

        it('splits the time between the previous subtitle and the new subtitle if there is less than 6 seconds for them both', function() {
            subtitleList.updateSubtitleTime(sub1, 0, 2000);
            subtitleList.updateSubtitleTime(sub2, 3000, 7000);
            var newSub = subtitleList.insertSubtitleBefore(sub2);

            expect(subtitleList.subtitles).toEqual([sub1, newSub, sub2]);
            expect(sub1).toHaveTimes([0, 1500]);
            expect(newSub).toHaveTimes([1500, 3000]);
        });
    });

    describe('insertBefore with first synced subtitle', function() {
        var sub1;
        beforeEach(function() {
            sub1 = subtitleList.insertSubtitleBefore(null);
        });

        it('inserts a 3 second subtitle in the middle of the initial empty time, if there is a 3 second gap', function() {
            subtitleList.updateSubtitleTime(sub1, 4000, 5000);
            var newSub = subtitleList.insertSubtitleBefore(sub1);

            expect(subtitleList.subtitles).toEqual([newSub, sub1]);
            expect(newSub).toHaveTimes([500, 3500]);
        });

        it('adjusts the start time of the next subtitle to make room for the new subtitle, if there is less than a 3 second gap', function() {
            subtitleList.updateSubtitleTime(sub1, 2000, 7000);
            var newSub = subtitleList.insertSubtitleBefore(sub1);

            expect(subtitleList.subtitles).toEqual([newSub, sub1]);
            expect(newSub).toHaveTimes([0, 3000]);
            expect(sub1).toHaveTimes([3000, 7000]);
        });

        it('splits the time between the next subtitle and the new subtitle if there is less than 6 seconds for them both', function() {
            subtitleList.updateSubtitleTime(sub1, 2000, 3000);
            var newSub = subtitleList.insertSubtitleBefore(sub1);

            expect(subtitleList.subtitles).toEqual([newSub, sub1]);
            expect(newSub).toHaveTimes([0, 1500]);
            expect(sub1).toHaveTimes([1500, 3000]);
        });
    });

    describe('split subtitles', function() {
        it('splits subtitles', function() {
            var sub1 = subtitleList.insertSubtitleBefore(null);
            subtitleList.updateSubtitleTime(sub1, 0, 8000);

            var sub2 = subtitleList.splitSubtitle(sub1, 'foo', 'bar');

            expect(sub1).toHaveTimes([0, 4000]);
            expect(sub1.markdown).toEqual('foo');
            expect(sub2).toHaveTimes([4000, 8000]);
            expect(sub2.markdown).toEqual('bar');
            expect(subtitleList.syncedCount).toEqual(2);
            expect(subtitleList.firstSubtitle()).toBe(sub1);
            expect(subtitleList.nextSubtitle(sub1)).toBe(sub2);
            expect(subtitleList.nextSubtitle(sub2)).toBe(null);

            var sub3 = subtitleList.splitSubtitle(sub2, 'b', 'ar');

            expect(sub2).toHaveTimes([4000, 6000]);
            expect(sub2.markdown).toEqual('b');
            expect(sub3).toHaveTimes([6000, 8000]);
            expect(sub3.markdown).toEqual('ar');
            expect(subtitleList.syncedCount).toEqual(3);
            expect(subtitleList.firstSubtitle()).toBe(sub1);
            expect(subtitleList.nextSubtitle(sub1)).toBe(sub2);
            expect(subtitleList.nextSubtitle(sub2)).toBe(sub3);
            expect(subtitleList.nextSubtitle(sub3)).toBe(null);
        });

        it('splits unsynced subtitles', function() {
            var sub = subtitleList.insertSubtitleBefore(null);
            var sub2 = subtitleList.splitSubtitle(sub, 'one', 'two');

            expect(sub).toHaveTimes([-1, -1]);
            expect(sub2).toHaveTimes([-1, -1]);
            expect(subtitleList.syncedCount).toEqual(0);
        });

        it('preserves region when splitting subtitles', function() {
            var sub1 = subtitleList.insertSubtitleBefore(null);
            subtitleList.updateSubtitleTime(sub1, 0, 8000);
            subtitleList.updateSubtitleRegion(sub1, 'top');

            var sub2 = subtitleList.splitSubtitle(sub1, 'foo', 'bar');
            expect(sub2.region).toBe('top');
        });
    });

    describe('undo', function() {
        it('can undo operations', function() {
            var sub = subtitleList._insertSubtitle(0, {
                startTime: 0, endTime: 100, content: 'test-content'
            });
            subtitleList._resetUndo();

            subtitleList.splitSubtitle(sub, 'test', 'content');
            expect(subtitleList.canUndo()).toEqual(true);
            subtitleList.undo();

            expect(subtitleList.subtitles.length).toEqual(1);
            expect(subtitleList.subtitles[0]).toHaveTimes([0, 100]);
            expect(subtitleList.subtitles[0].markdown).toEqual('test-content');
            expect(subtitleList.canUndo()).toEqual(false);
        });

        it('can redo operations', function() {
            var sub = subtitleList._insertSubtitle(0, {
                startTime: 0, endTime: 100, content: 'test-content'
            });
            subtitleList._resetUndo();

            subtitleList.splitSubtitle(sub, 'test', 'content');
            subtitleList.undo();

            expect(subtitleList.canRedo()).toEqual(true);
            subtitleList.redo();

            expect(subtitleList.subtitles.length).toEqual(2);
            expect(subtitleList.subtitles[0]).toHaveTimes([0, 50]);
            expect(subtitleList.subtitles[0].markdown).toEqual('test');

            expect(subtitleList.subtitles[1]).toHaveTimes([50, 100]);
            expect(subtitleList.subtitles[1].markdown).toEqual('content');

            expect(subtitleList.canUndo()).toEqual(true);
            expect(subtitleList.canRedo()).toEqual(false);
        });

        it('can recreate removed subtitles', function() {
            subtitleList._insertSubtitle(0, { startTime: 0, endTime: 100 });
            subtitleList._resetUndo();

            var sub = subtitleList.insertSubtitleBefore(null);
            subtitleList.updateSubtitleContent(sub, 'test-content');
            subtitleList.updateSubtitleTime(sub, 200, 300);
            subtitleList.updateSubtitleParagraph(sub, true);
            subtitleList.updateSubtitleRegion(sub, 'top');
            subtitleList.removeSubtitle(sub);

            subtitleList.undo();

            // test that all attributes were successfully recreated
            var sub = subtitleList.subtitles[1];
            expect(sub.startTime).toEqual(200);
            expect(sub.endTime).toEqual(300);
            expect(sub.markdown).toEqual('test-content');
            expect(sub.startOfParagraph).toEqual(true);
            expect(sub.region).toEqual('top');
        });

        it('can recreate updated subtitles', function() {
            subtitleList._insertSubtitle(0, { startTime: 0, endTime: 100 });
            subtitleList._resetUndo();

            var sub = subtitleList.insertSubtitleBefore(null);

            subtitleList.updateSubtitleContent(sub, 'changed');
            subtitleList.updateSubtitleTime(sub, 1000, 2000);
            subtitleList.updateSubtitleParagraph(sub, true);
            subtitleList.updateSubtitleRegion(sub, 'top');

            subtitleList.undo();
            subtitleList.undo();
            subtitleList.undo();
            subtitleList.undo();

            // test that all attributes were successfully recreated

            var sub = subtitleList.subtitles[1];
            expect(sub).toHaveTimes([-1, -1]);
            expect(sub.markdown).toEqual('');
            expect(sub.startOfParagraph).toEqual(false);
            expect(sub.region).toEqual(undefined);
        });

        it('undos operations in the correct order', function() {
            subtitleList._insertSubtitle(0, {
                startTime: 0, endTime: 100, content: 'test-content'
            });
            subtitleList._removeSubtitle(0, {});
            subtitleList._changesDone('test');

            // When we undo multiple changes, we need to undo them in reverse
            // order.  If we try to undo the insert before undoing the remove,
            // then things will fail
            subtitleList.undo();
            expect(subtitleList.subtitles).toEqual([]);

            // Try redo and undo again to test the code there
            subtitleList.redo();
            subtitleList.undo();

            expect(subtitleList.subtitles).toEqual([]);
        });

        it('has helper methods for the undo/redo menu items', function() {
            expect(subtitleList.canUndo()).toEqual(false);
            expect(subtitleList.canRedo()).toEqual(false);

            subtitleList._insertSubtitle(0, {});
            subtitleList._changesDone('change 1');
            expect(subtitleList.canUndo()).toEqual(true);
            expect(subtitleList.canRedo()).toEqual(false);
            expect(subtitleList.undoText().data.command).toEqual('change 1');

            subtitleList._insertSubtitle(0, {});
            subtitleList._changesDone('change 2');
            expect(subtitleList.canUndo()).toEqual(true);
            expect(subtitleList.canRedo()).toEqual(false);
            expect(subtitleList.undoText().data.command).toEqual('change 2');

            subtitleList.undo();
            expect(subtitleList.canUndo()).toEqual(true);
            expect(subtitleList.canRedo()).toEqual(true);
            expect(subtitleList.undoText().data.command).toEqual('change 1');
            expect(subtitleList.redoText().data.command).toEqual('change 2');

            subtitleList.undo();
            expect(subtitleList.canUndo()).toEqual(false);
            expect(subtitleList.canRedo()).toEqual(true);
            expect(subtitleList.redoText().data.command).toEqual('change 1');

        });

        it('can handle complex undo/redo stacks', function() {
            var sub = subtitleList._insertSubtitle(0, {
                startTime: 0, endTime: 100, content: 'test-content'
            });
            subtitleList._resetUndo();

            subtitleList.splitSubtitle(sub, 'test', 'content');
            subtitleList.insertSubtitleBefore(null);

            subtitleList.undo();
            subtitleList.undo();
            subtitleList.redo();
            subtitleList.undo();

            subtitleList.updateSubtitleContent(sub, 'test-content2');

            expect(subtitleList.subtitles.length).toEqual(1);
            expect(subtitleList.subtitles[0]).toHaveTimes([0, 100]);
            expect(subtitleList.subtitles[0].markdown).toEqual('test-content2');

            subtitleList.undo();
            expect(subtitleList.subtitles.length).toEqual(1);
            expect(subtitleList.subtitles[0]).toHaveTimes([0, 100]);
            expect(subtitleList.subtitles[0].markdown).toEqual('test-content');
        });
    });
});
