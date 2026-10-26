import asyncio
import httpx
import pytest

from cauce.quota_fallback import PENDING, QuotaFallback


def test_quota_pauses_and_retries_only_pending_call_with_local(monkeypatch):
    saved = []
    monkeypatch.setattr('cauce.quota_fallback.store.save_job', lambda workspace, value: saved.append(value['status']))

    class Gemini:
        name = 'gemini'
        model = 'cloud'
        async def json(self, prompt):
            if prompt == 'done':
                return {'ok': 'cloud'}
            raise httpx.HTTPStatusError('quota', request=httpx.Request('POST', 'https://example.org'), response=httpx.Response(429))

    class Local:
        name = 'ollama'
        model = 'local'
        def __init__(self):
            self.calls = []
        async def json(self, prompt):
            self.calls.append(prompt)
            return {'ok': 'local'}

    async def scenario():
        value = {'id': 'quota-test', 'status': 'running'}
        provider = QuotaFallback(Gemini(), 'workspace', value)
        assert await provider.json('done') == {'ok': 'cloud'}
        task = asyncio.create_task(provider.json('pending'))
        await asyncio.sleep(0)
        assert value['status'] == 'waiting_provider'
        assert not task.done()
        local = Local()
        PENDING[('workspace', 'quota-test')].set_result(local)
        assert await task == {'ok': 'local'}
        assert local.calls == ['pending']
        assert value['status'] == 'running'
        assert not PENDING
        assert saved == ['waiting_provider', 'running']

    asyncio.run(scenario())


def test_other_http_errors_do_not_offer_quota_fallback(monkeypatch):
    class Provider:
        name = 'gemini'
        async def json(self):
            raise httpx.HTTPStatusError('bad key', request=httpx.Request('POST', 'https://example.org'), response=httpx.Response(403))

    async def scenario():
        with pytest.raises(httpx.HTTPStatusError):
            await QuotaFallback(Provider(), 'workspace', {'id': 'test'}).json()
        assert not PENDING

    asyncio.run(scenario())
