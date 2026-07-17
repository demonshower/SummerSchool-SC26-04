/**
 * 出差行程表单 - 动态会议列表管理
 */
(function() {
    'use strict';

    let meetingCount = 1;
    const maxMeetings = 10;
    const container = document.getElementById('meetingsContainer');
    const addBtn = document.getElementById('addMeetingBtn');
    const meetingError = document.getElementById('meetingError');
    const form = document.getElementById('tripForm');

    /** 创建一场新会议的 HTML 块 */
    function createMeetingBlock(index) {
        const div = document.createElement('div');
        div.className = 'meeting-item border rounded p-3 mb-3 position-relative';
        div.dataset.index = index;
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="badge bg-primary">会议 #${index + 1}</span>
                <button type="button" class="btn btn-outline-danger btn-sm remove-meeting">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <div class="row g-2">
                <div class="col-md-4">
                    <label class="form-label">会议日期 <span class="text-danger">*</span></label>
                    <input type="date" class="form-control meeting-date" name="meeting_dates" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label">开始时间 <span class="text-danger">*</span></label>
                    <input type="time" class="form-control meeting-start" name="meeting_starts" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label">结束时间 <span class="text-danger">*</span></label>
                    <input type="time" class="form-control meeting-end" name="meeting_ends" required>
                </div>
                <div class="col-md-2">
                    <label class="form-label">地点 <span class="text-danger">*</span></label>
                    <input type="text" class="form-control meeting-location" name="meeting_locations" placeholder="如：西湖区" required>
                </div>
            </div>
        `;
        return div;
    }

    /** 刷新所有会议编号 */
    function renumberMeetings() {
        const items = container.querySelectorAll('.meeting-item');
        items.forEach((item, i) => {
            item.dataset.index = i;
            item.querySelector('.badge').textContent = `会议 #${i + 1}`;
        });
    }

    /** 更新删除按钮的可见性 */
    function updateRemoveButtons() {
        const items = container.querySelectorAll('.meeting-item');
        const removeBtns = container.querySelectorAll('.remove-meeting');
        removeBtns.forEach(btn => {
            btn.style.display = items.length <= 1 ? 'none' : '';
        });
    }

    // 添加会议
    addBtn.addEventListener('click', function() {
        if (meetingCount >= maxMeetings) {
            showError(`最多支持 ${maxMeetings} 场会议`);
            return;
        }
        meetingCount++;
        const block = createMeetingBlock(meetingCount - 1);
        container.appendChild(block);
        updateRemoveButtons();
        hideError();
    });

    // 删除会议（事件委托）
    container.addEventListener('click', function(e) {
        const removeBtn = e.target.closest('.remove-meeting');
        if (!removeBtn) return;
        const item = removeBtn.closest('.meeting-item');
        const items = container.querySelectorAll('.meeting-item');
        if (items.length <= 1) return;
        item.remove();
        renumberMeetings();
        updateRemoveButtons();
    });

    /** 显示错误 */
    function showError(msg) {
        meetingError.textContent = msg;
        meetingError.classList.remove('d-none');
    }

    /** 隐藏错误 */
    function hideError() {
        meetingError.classList.add('d-none');
    }

    /** 校验出发城市和目的地是否相同 */
    function validateCities() {
        const origin = document.getElementById('origin_city').value;
        const dest = document.getElementById('destination_city').value;
        if (origin && dest && origin === dest) {
            showError('出发城市和出差城市不能相同');
            return false;
        }
        hideError();
        return true;
    }

    document.getElementById('destination_city').addEventListener('change', validateCities);
    document.getElementById('origin_city').addEventListener('change', validateCities);

    // 表单提交前校验
    form.addEventListener('submit', function(e) {
        // 先做 Bootstrap 内置校验
        if (!form.checkValidity()) {
            e.preventDefault();
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
        }

        // 校验城市不同
        if (!validateCities()) {
            e.preventDefault();
            return;
        }

        // 校验会议时间
        const dates = form.querySelectorAll('.meeting-date');
        const starts = form.querySelectorAll('.meeting-start');
        const ends = form.querySelectorAll('.meeting-end');
        const earliest = new Date(document.getElementById('earliest_departure').value);
        const latest = new Date(document.getElementById('latest_return').value);

        for (let i = 0; i < dates.length; i++) {
            const meetingDate = new Date(dates[i].value + 'T' + starts[i].value);
            const meetingEnd = new Date(dates[i].value + 'T' + ends[i].value);

            if (meetingEnd <= meetingDate) {
                showError(`会议 #${i + 1} 的结束时间必须晚于开始时间`);
                e.preventDefault();
                return;
            }

            if (meetingDate < earliest || meetingEnd > latest) {
                showError(`会议 #${i + 1} 的时间必须在行程范围内`);
                e.preventDefault();
                return;
            }
        }

        // 校验会议之间不重叠
        for (let i = 0; i < dates.length; i++) {
            for (let j = i + 1; j < dates.length; j++) {
                const ai = new Date(dates[i].value + 'T' + starts[i].value);
                const aj = new Date(dates[i].value + 'T' + ends[i].value);
                const bi = new Date(dates[j].value + 'T' + starts[j].value);
                const bj = new Date(dates[j].value + 'T' + ends[j].value);

                if (ai < bj && bi < aj) {
                    showError(`会议 #${i + 1} 和会议 #${j + 1} 的时间有冲突`);
                    e.preventDefault();
                    return;
                }
            }
        }

        hideError();
        form.classList.add('was-validated');
    });
})();
