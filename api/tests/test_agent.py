from api.agent import build_system_prompt, build_user_prompt
from api.models import Job


def make_test_job(**overrides) -> Job:
    defaults = dict(
        job_id="abc123",
        user_id="anonymous",
        chat_id="default",
        prompt="make a 4-helix bundle",
        output_dir="/outputs/users/anonymous/default/abc123",
    )
    return Job(**(defaults | overrides))


def test_system_prompt_contains_contig_syntax():
    prompt = build_system_prompt()
    assert "contigmap.contigs" in prompt
    assert "run_inference.py" in prompt


def test_system_prompt_contains_example_commands():
    prompt = build_system_prompt()
    assert "unconditional" in prompt.lower()
    assert "binder" in prompt.lower() or "ppi" in prompt.lower()


def test_system_prompt_contains_pymol_rendering():
    prompt = build_system_prompt()
    assert "pymol" in prompt.lower()


def test_user_prompt_includes_job_details():
    job = make_test_job(prompt="design a beta barrel")
    prompt = build_user_prompt(job)
    assert "design a beta barrel" in prompt
    assert job.output_dir in prompt
    assert str(job.max_iterations) in prompt


def test_user_prompt_includes_pdb_when_provided():
    job = make_test_job()
    prompt_without = build_user_prompt(job)
    assert "input PDB" not in prompt_without

    job_with_pdb = make_test_job()
    prompt_with = build_user_prompt(job_with_pdb, input_pdb_path="/tmp/input.pdb")
    assert "/tmp/input.pdb" in prompt_with
