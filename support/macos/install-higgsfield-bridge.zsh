#!/bin/zsh
set -euo pipefail

label='ai.tipo.higgsfield-bridge'
script_dir="${0:A:h}"
project_dir="${script_dir:h:h}"
template_file="${script_dir}/${label}.plist"
user_id="$(id -u)"
user_home="${HOME}"
launch_agents_dir="${user_home}/Library/LaunchAgents"
log_dir="${user_home}/Library/Logs/Tipo"
target_file="${launch_agents_dir}/${label}.plist"
service="gui/${user_id}/${label}"

if [[ "${1:-install}" == '--uninstall' ]]; then
  launchctl bootout "${service}" 2>/dev/null || true
  rm -f "${target_file}"
  print "Tipó Higgsfield bridge removido do login deste usuário."
  exit 0
fi

node_bin="$(command -v node)"
if [[ -x "${user_home}/bin/higgsfield" ]]; then
  cli_bin="${user_home}/bin/higgsfield"
elif [[ -x "${user_home}/.local/bin/higgsfield" ]]; then
  cli_bin="${user_home}/.local/bin/higgsfield"
else
  cli_bin="$(command -v higgsfield || true)"
fi
if [[ ! -x "${node_bin}" ]]; then
  print -u2 'Node.js não encontrado.'
  exit 1
fi
if [[ ! -x "${cli_bin}" ]]; then
  print -u2 'Higgsfield CLI não encontrado.'
  exit 1
fi
if ! "${node_bin}" --check "${project_dir}/higgsfield-bridge.mjs" >/dev/null; then
  print -u2 'O bridge Higgsfield contém um erro de sintaxe; o serviço atual foi preservado.'
  exit 1
fi

mkdir -p "${launch_agents_dir}" "${log_dir}"
temp_file="$(mktemp /tmp/tipo-higgsfield-launchagent.XXXXXX)"
backup_file="$(mktemp /tmp/tipo-higgsfield-launchagent-backup.XXXXXX)"
live_file="$(mktemp /tmp/tipo-higgsfield-live.XXXXXX)"
trap 'rm -f "${temp_file}" "${backup_file}" "${live_file}"' EXIT
had_target=0
was_loaded=0
if [[ -f "${target_file}" ]]; then
  cp "${target_file}" "${backup_file}"
  had_target=1
fi
if launchctl print "${service}" >/dev/null 2>&1; then
  was_loaded=1
fi
cp "${template_file}" "${temp_file}"

program_arguments="[\"${node_bin}\",\"${project_dir}/higgsfield-bridge.mjs\"]"
plutil -replace ProgramArguments -json "${program_arguments}" "${temp_file}"
plutil -replace WorkingDirectory -string "${project_dir}" "${temp_file}"
plutil -replace EnvironmentVariables.HOME -string "${user_home}" "${temp_file}"
plutil -replace EnvironmentVariables.PATH -string "${user_home}/bin:${user_home}/.local/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" "${temp_file}"
plutil -replace EnvironmentVariables.TIPO_HIGGSFIELD_BIN -string "${cli_bin}" "${temp_file}"
if [[ -n "${TIPO_HIGGSFIELD_ORIGINS:-}" ]]; then
  plutil -insert EnvironmentVariables.TIPO_HIGGSFIELD_ORIGINS -string "${TIPO_HIGGSFIELD_ORIGINS}" "${temp_file}"
fi
plutil -replace StandardOutPath -string "${log_dir}/higgsfield-bridge.log" "${temp_file}"
plutil -replace StandardErrorPath -string "${log_dir}/higgsfield-bridge.error.log" "${temp_file}"
plutil -lint "${temp_file}" >/dev/null

bootstrap_service() {
  local attempt
  for attempt in 1 2 3; do
    if launchctl bootstrap "gui/${user_id}" "${target_file}" 2>/dev/null; then
      return 0
    fi
    # launchd pode manter o label em transição por alguns instantes depois do
    # bootout. Uma nova tentativa evita falso negativo nessa janela.
    sleep "${attempt}"
  done
  return 1
}

wait_for_live() {
  local attempt
  for attempt in {1..15}; do
    if launchctl print "${service}" >/dev/null 2>&1 \
      && /usr/bin/curl --fail --silent --show-error --max-time 2 \
        'http://127.0.0.1:4789/live' >"${live_file}" 2>/dev/null \
      && /usr/bin/grep -q '"service":"tipo-higgsfield-bridge"' "${live_file}"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

rollback_service() {
  launchctl bootout "${service}" 2>/dev/null || true
  if (( had_target )); then
    install -m 600 "${backup_file}" "${target_file}"
    if (( was_loaded )); then
      bootstrap_service || return 1
      launchctl enable "${service}" || return 1
      launchctl kickstart -k "${service}" || return 1
      wait_for_live || return 1
    fi
  else
    rm -f "${target_file}"
  fi
}

install -m 600 "${temp_file}" "${target_file}"
launchctl bootout "${service}" 2>/dev/null || true

installed=1
bootstrap_service || installed=0
if (( installed )); then launchctl enable "${service}" || installed=0; fi
if (( installed )); then launchctl kickstart -k "${service}" || installed=0; fi
if (( installed )); then wait_for_live || installed=0; fi

if (( ! installed )); then
  print -u2 'A nova versão do serviço não ficou saudável; restaurando a instalação anterior.'
  if ! rollback_service; then
    print -u2 'A restauração automática também falhou. Rode este instalador novamente.'
  fi
  exit 1
fi

print "Tipó Higgsfield bridge instalado e iniciado: ${service}"
print "Logs: ${log_dir}"
