describe('TABS.cli', () => {

    function toArrayBuffer(string) {
        var bufferOut = new ArrayBuffer(string.length);
        var bufView = new Uint8Array(bufferOut);

        for (var i = 0; i < string.length; i++) {
            bufView[i] = string.charCodeAt(i);
        }

        return bufferOut;
    }

    describe('output', () => {
        const cliTab = $('<div>').addClass('tab-cli');
        const cliOutput = $('<div>').addClass('wrapper')
        const cliPrompt = $('<textarea>');

        cliTab.append($('<div>').addClass('window').append(cliOutput));
        cliTab.append(cliPrompt);

        before(() => {
            $('body')
                .append(cliTab);

            CONFIGURATOR.cliValid = true;
        });

        after(() => cliTab.remove());

        beforeEach(() => {
            cliOutput.empty();
            cliPrompt.val('');
            TABS.cli.cliBuffer = "";
        });

        it('ambiguous auto-complete results', () => {
            TABS.cli.read({
                data: toArrayBuffer('\r\033[Kserialpassthrough\tservo\r\n# ser')
            });

            expect(cliOutput.html()).to.equal('<br>serialpassthrough\tservo<br># ser');
            expect(cliPrompt.val()).to.equal('ser');
        });

        it('unambiguous auto-complete result', () => {
            TABS.cli.read({
                data: toArrayBuffer('serialpassthrough\r\n# serialpassthrough')
            });

            expect(cliOutput.html()).to.equal('serialpassthrough<br># serialpassthrough');
            expect(cliPrompt.val()).to.equal('serialpassthrough');
        });

        it("escape characters (i.e. \033[K) are skipped", () => {
            TABS.cli.read({
                data: toArrayBuffer('\033[K')
            });

            expect(cliOutput.html()).to.equal('');
            expect(cliPrompt.val()).to.equal('');
        });
    });

    function triggerEnterKey(input) {
        const enterKeycode = 13;
        const event = $.Event("keypress");
        event.which = enterKeycode;
        input.trigger(event);
    }

    function triggerTabKey(input) {
        const tabKeycode = 9;
        const event = $.Event("keydown");
        event.which = tabKeycode;
        input.trigger(event);
    }

    describe('input', () => {
        const content = $('<div>').attr('id', 'content');
        const cliTab = $('<div>').addClass('tab-cli');
        const cliPrompt = $('<textarea>');
        cliTab.append(cliPrompt);

        beforeEach(() => {
            $('body')
                .append(content);

            // Stub loading of template.
            sinon.stub($.fn, 'load').callsFake((file, callback) => {
                content.append(cliTab);
                callback();
            });
            sinon.stub(TABS.cli, 'send');
            sinon.stub(Promise, 'reduce').callsFake((items, cb, initialValue) => {
                items.forEach((line, idx) => cb(0, line, idx));
            });
            sinon.stub(window, 'Promise').callsFake(resolve => resolve(0));
            sinon.stub(GUI, 'timeout_add').withArgs('CLI_send_slowly')
                .callsFake((name, cb) => {
                    cb();
                });

            TABS.cli.cliBuffer = "";
        });

        afterEach(() => {
            content.remove();
            $.fn.load.restore();
            TABS.cli.send.restore();
            Promise.reduce.restore();
            Promise.restore();
            GUI.timeout_add.restore();
        });

        beforeEach(() => {
            cliPrompt.val('');
            content.empty();
        });

        it('tab key triggers serial message with appended tab char', done => {
            TABS.cli.initialize(() => {
                cliPrompt.val('serial');

                triggerTabKey(cliPrompt);

                expect(TABS.cli.send).to.have.been.calledOnce;
                expect(TABS.cli.send).to.have.been.calledWith('serial\t');
                done()
            });
        });

        it('second auto complete in row', done => {
            TABS.cli.cliBuffer = '# ser';

            TABS.cli.initialize(() => {
                cliPrompt.val('seri');

                triggerTabKey(cliPrompt);

                expect(TABS.cli.send).to.have.been.calledOnce;
                expect(TABS.cli.send).to.have.been.calledWith('i\t');
                done();
            });
        });

        it('auto-complete command with trailing space', done => {
            TABS.cli.cliBuffer = '# get ';

            TABS.cli.initialize(() => {
                cliPrompt.val('get r');

                triggerTabKey(cliPrompt);

                expect(TABS.cli.send).to.have.been.calledOnce;
                expect(TABS.cli.send).to.have.been.calledWith('r\t');
                done();
            });
        });

        it('auto-complete after delete characters', done => {
            TABS.cli.cliBuffer = '# serial';

            TABS.cli.initialize(() => {
                cliPrompt.val('ser');

                triggerTabKey(cliPrompt);

                const backspace = String.fromCharCode(127);

                expect(TABS.cli.send).to.have.been.calledOnce;
                expect(TABS.cli.send).to.have.been.calledWith(backspace.repeat(3) + '\t');
                done();
            });
        });

        it('enter after autocomplete', done => {
            TABS.cli.cliBuffer = '# servo';

            TABS.cli.initialize(() => {
                cliPrompt.val('servo');

                triggerEnterKey(cliPrompt);

                expect(TABS.cli.send).to.have.been.calledOnce;
                expect(TABS.cli.send).to.have.been.calledWith('\n');
                done();
            });
        });

        it('enter after autocomplete', done => {
            TABS.cli.cliBuffer = '# ser';

            TABS.cli.initialize(() => {
                cliPrompt.val('servo');

                triggerEnterKey(cliPrompt);

                expect(TABS.cli.send).to.have.been.calledOnce;
                expect(TABS.cli.send).to.have.been.calledWith('vo\n');
                done();
            });
        });

        it('enter after deleting characters', done => {
            TABS.cli.cliBuffer = '# serial';

            TABS.cli.initialize(() => {
                cliPrompt.val('ser');

                triggerEnterKey(cliPrompt);

                const backspace = String.fromCharCode(127);

                expect(TABS.cli.send).to.have.been.calledOnce;
                expect(TABS.cli.send).to.have.been.calledWith(backspace.repeat(3) + '\n');
                done();
            });
        });
    });
});
